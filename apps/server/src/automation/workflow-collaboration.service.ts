import { Injectable, Logger } from '@nestjs/common';
import { WorkflowDefinition } from './interfaces/action.interface';

export interface CollaborationSession {
  id: string;
  workflowId: string;
  participants: Map<string, CollaborationUser>;
  currentWorkflow: WorkflowDefinition;
  changes: CollaborationChange[];
  locks: Map<string, string>; // blockId -> userId
  createdAt: Date;
  lastActivity: Date;
}

export interface CollaborationUser {
  userId: string;
  username: string;
  color: string;
  cursor?: { x: number; y: number };
  selectedNode?: string;
  joinedAt: Date;
  lastSeen: Date;
}

export interface CollaborationChange {
  id: string;
  type: 'node_add' | 'node_update' | 'node_delete' | 'edge_add' | 'edge_delete' | 'metadata_update';
  userId: string;
  timestamp: Date;
  data: any;
  applied: boolean;
}

export interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  nodeId?: string;
}

@Injectable()
export class WorkflowCollaborationService {
  private readonly logger = new Logger(WorkflowCollaborationService.name);
  private sessions: Map<string, CollaborationSession> = new Map();
  private readonly userColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];

  /**
   * Create or join a collaboration session
   */
  joinSession(
    workflowId: string,
    userId: string,
    username: string,
  ): { sessionId: string; session: CollaborationSession } {
    const sessionId = `collab-${workflowId}`;
    let session = this.sessions.get(sessionId);

    if (!session) {
      // Create new session
      session = {
        id: sessionId,
        workflowId,
        participants: new Map(),
        currentWorkflow: {} as WorkflowDefinition,
        changes: [],
        locks: new Map(),
        createdAt: new Date(),
        lastActivity: new Date(),
      };
      this.sessions.set(sessionId, session);
      this.logger.log(`Created collaboration session: ${sessionId}`);
    }

    // Add participant
    const color = this.userColors[session.participants.size % this.userColors.length];
    const user: CollaborationUser = {
      userId,
      username,
      color,
      joinedAt: new Date(),
      lastSeen: new Date(),
    };

    session.participants.set(userId, user);
    session.lastActivity = new Date();

    this.logger.log(`User ${username} joined session ${sessionId}`);

    return { sessionId, session: this.serializeSession(session) };
  }

  /**
   * Leave a collaboration session
   */
  leaveSession(sessionId: string, userId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.participants.delete(userId);

    // Release any locks held by this user
    for (const [blockId, lockUserId] of session.locks.entries()) {
      if (lockUserId === userId) {
        session.locks.delete(blockId);
      }
    }

    // Clean up empty sessions
    if (session.participants.size === 0) {
      this.sessions.delete(sessionId);
      this.logger.log(`Cleaned up empty session: ${sessionId}`);
    } else {
      this.logger.log(`User ${userId} left session ${sessionId}`);
    }
  }

  /**
   * Update cursor position
   */
  updateCursor(
    sessionId: string,
    userId: string,
    position: { x: number; y: number },
  ): CursorPosition[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const user = session.participants.get(userId);
    if (!user) {
      throw new Error('User not in session');
    }

    user.cursor = position;
    user.lastSeen = new Date();
    session.lastActivity = new Date();

    // Return all cursor positions
    return Array.from(session.participants.values())
      .filter((u) => u.userId !== userId && u.cursor)
      .map((u) => ({
        userId: u.userId,
        x: u.cursor!.x,
        y: u.cursor!.y,
        nodeId: u.selectedNode,
      }));
  }

  /**
   * Lock a node for editing
   */
  lockNode(sessionId: string, userId: string, nodeId: string): {
    success: boolean;
    lockedBy?: string;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const existingLock = session.locks.get(nodeId);
    if (existingLock && existingLock !== userId) {
      const lockHolder = session.participants.get(existingLock);
      return {
        success: false,
        lockedBy: lockHolder?.username || existingLock,
      };
    }

    session.locks.set(nodeId, userId);
    session.lastActivity = new Date();

    this.logger.debug(`Node ${nodeId} locked by user ${userId} in session ${sessionId}`);

    return { success: true };
  }

  /**
   * Unlock a node
   */
  unlockNode(sessionId: string, userId: string, nodeId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const lockHolder = session.locks.get(nodeId);
    if (lockHolder === userId) {
      session.locks.delete(nodeId);
      session.lastActivity = new Date();
      this.logger.debug(`Node ${nodeId} unlocked by user ${userId} in session ${sessionId}`);
    }
  }

  /**
   * Apply a change to the workflow
   */
  applyChange(
    sessionId: string,
    userId: string,
    change: Omit<CollaborationChange, 'id' | 'userId' | 'timestamp' | 'applied'>,
  ): CollaborationChange {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const fullChange: CollaborationChange = {
      ...change,
      id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      timestamp: new Date(),
      applied: false,
    };

    // Check if change requires a lock
    const nodeId = this.extractNodeId(change);
    if (nodeId) {
      const lockHolder = session.locks.get(nodeId);
      if (lockHolder && lockHolder !== userId) {
        throw new Error(`Node is locked by another user`);
      }
    }

    // Apply change to current workflow
    try {
      this.applyChangeToWorkflow(session.currentWorkflow, fullChange);
      fullChange.applied = true;
    } catch (error: any) {
      this.logger.error(`Failed to apply change: ${error.message}`);
      throw error;
    }

    session.changes.push(fullChange);
    session.lastActivity = new Date();

    // Limit change history to last 100 changes
    if (session.changes.length > 100) {
      session.changes = session.changes.slice(-100);
    }

    this.logger.debug(`Applied change ${fullChange.id} by user ${userId} in session ${sessionId}`);

    return fullChange;
  }

  /**
   * Get session state
   */
  getSession(sessionId: string): CollaborationSession | null {
    const session = this.sessions.get(sessionId);
    return session ? this.serializeSession(session) : null;
  }

  /**
   * Get active participants
   */
  getParticipants(sessionId: string): CollaborationUser[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return Array.from(session.participants.values());
  }

  /**
   * Get change history
   */
  getChangeHistory(
    sessionId: string,
    limit: number = 50,
  ): CollaborationChange[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return session.changes.slice(-limit);
  }

  /**
   * Sync workflow state
   */
  syncWorkflow(
    sessionId: string,
    workflow: WorkflowDefinition,
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.currentWorkflow = workflow;
    session.lastActivity = new Date();

    this.logger.debug(`Workflow synced for session ${sessionId}`);
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values()).map((s) => this.serializeSession(s));
  }

  /**
   * Clean up inactive sessions
   */
  cleanupInactiveSessions(maxAge: number = 3600000): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now - session.lastActivity.getTime();
      if (age > maxAge) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} inactive collaboration sessions`);
    }
  }

  /**
   * Check if node is locked
   */
  isNodeLocked(sessionId: string, nodeId: string): {
    locked: boolean;
    lockedBy?: string;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { locked: false };
    }

    const lockHolder = session.locks.get(nodeId);
    if (lockHolder) {
      const user = session.participants.get(lockHolder);
      return {
        locked: true,
        lockedBy: user?.username || lockHolder,
      };
    }

    return { locked: false };
  }

  /**
   * Broadcast change to all participants (handled by WebSocket gateway)
   */
  broadcastChange(sessionId: string, change: CollaborationChange): CollaborationUser[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    // Return list of participants to notify
    return Array.from(session.participants.values()).filter(
      (u) => u.userId !== change.userId
    );
  }

  // Private helper methods

  private serializeSession(session: CollaborationSession): CollaborationSession {
    return {
      ...session,
      participants: new Map(session.participants),
      locks: new Map(session.locks),
    };
  }

  private extractNodeId(change: Omit<CollaborationChange, 'id' | 'userId' | 'timestamp' | 'applied'>): string | null {
    if (change.type.startsWith('node_')) {
      return change.data.nodeId || change.data.id || null;
    }
    return null;
  }

  private applyChangeToWorkflow(
    workflow: WorkflowDefinition,
    change: CollaborationChange,
  ): void {
    if (!workflow.blocks) {
      workflow.blocks = [];
    }

    switch (change.type) {
      case 'node_add':
        workflow.blocks.push(change.data.node);
        break;

      case 'node_update':
        const updateIndex = workflow.blocks.findIndex((b) => b.id === change.data.nodeId);
        if (updateIndex !== -1) {
          workflow.blocks[updateIndex] = {
            ...workflow.blocks[updateIndex],
            ...change.data.updates,
          };
        }
        break;

      case 'node_delete':
        workflow.blocks = workflow.blocks.filter((b) => b.id !== change.data.nodeId);
        break;

      case 'edge_add':
        // Edge is represented in block's onSuccess/onFailure/onTrue/onFalse
        const sourceBlock = workflow.blocks.find((b) => b.id === change.data.sourceId);
        if (sourceBlock) {
          const edgeType = change.data.edgeType || 'onSuccess';
          (sourceBlock as any)[edgeType] = change.data.targetId;
        }
        break;

      case 'edge_delete':
        const edgeSourceBlock = workflow.blocks.find((b) => b.id === change.data.sourceId);
        if (edgeSourceBlock) {
          const edgeType = change.data.edgeType || 'onSuccess';
          delete (edgeSourceBlock as any)[edgeType];
        }
        break;

      case 'metadata_update':
        workflow.metadata = {
          ...workflow.metadata,
          ...change.data,
        };
        break;

      default:
        throw new Error(`Unknown change type: ${change.type}`);
    }
  }
}

