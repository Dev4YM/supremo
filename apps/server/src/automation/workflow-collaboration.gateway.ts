import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { WorkflowCollaborationService } from './workflow-collaboration.service';

interface CollaborationClient extends Socket {
  userId?: string;
  sessionId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/workflow-collaboration',
})
export class WorkflowCollaborationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WorkflowCollaborationGateway.name);

  constructor(
    private collaborationService: WorkflowCollaborationService,
  ) {
    // Cleanup inactive sessions every 5 minutes
    setInterval(() => {
      this.collaborationService.cleanupInactiveSessions();
    }, 300000);
  }

  handleConnection(client: CollaborationClient) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: CollaborationClient) {
    if (client.sessionId && client.userId) {
      this.collaborationService.leaveSession(client.sessionId, client.userId);
      
      // Notify other participants
      this.server.to(client.sessionId).emit('participant-left', {
        userId: client.userId,
      });
    }
    
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-session')
  handleJoinSession(
    @ConnectedSocket() client: CollaborationClient,
    @MessageBody() data: { workflowId: string; userId: string; username: string },
  ) {
    try {
      const { sessionId, session } = this.collaborationService.joinSession(
        data.workflowId,
        data.userId,
        data.username,
      );

      client.userId = data.userId;
      client.sessionId = sessionId;
      client.join(sessionId);

      // Send current session state to joining user
      client.emit('session-joined', {
        sessionId,
        participants: Array.from(session.participants.values()),
        workflow: session.currentWorkflow,
        locks: Array.from(session.locks.entries()),
      });

      // Notify other participants
      client.to(sessionId).emit('participant-joined', {
        userId: data.userId,
        username: data.username,
        color: session.participants.get(data.userId)?.color,
      });

      this.logger.log(`User ${data.username} joined session ${sessionId}`);
    } catch (error: any) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('leave-session')
  handleLeaveSession(@ConnectedSocket() client: CollaborationClient) {
    if (client.sessionId && client.userId) {
      this.collaborationService.leaveSession(client.sessionId, client.userId);
      
      client.to(client.sessionId).emit('participant-left', {
        userId: client.userId,
      });

      client.leave(client.sessionId);
      client.sessionId = undefined;
    }
  }

  @SubscribeMessage('cursor-move')
  handleCursorMove(
    @ConnectedSocket() client: CollaborationClient,
    @MessageBody() data: { x: number; y: number },
  ) {
    if (!client.sessionId || !client.userId) return;

    try {
      const cursors = this.collaborationService.updateCursor(
        client.sessionId,
        client.userId,
        data,
      );

      // Broadcast cursor position to other participants
      client.to(client.sessionId).emit('cursor-update', {
        userId: client.userId,
        ...data,
      });
    } catch (error: any) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('node-select')
  handleNodeSelect(
    @ConnectedSocket() client: CollaborationClient,
    @MessageBody() data: { nodeId: string | null },
  ) {
    if (!client.sessionId || !client.userId) return;

    // Broadcast node selection to other participants
    client.to(client.sessionId).emit('node-selected', {
      userId: client.userId,
      nodeId: data.nodeId,
    });
  }

  @SubscribeMessage('lock-node')
  handleLockNode(
    @ConnectedSocket() client: CollaborationClient,
    @MessageBody() data: { nodeId: string },
  ) {
    if (!client.sessionId || !client.userId) return;

    try {
      const result = this.collaborationService.lockNode(
        client.sessionId,
        client.userId,
        data.nodeId,
      );

      if (result.success) {
        client.emit('node-locked', { nodeId: data.nodeId });
        
        // Notify other participants
        client.to(client.sessionId).emit('node-locked-by-other', {
          nodeId: data.nodeId,
          userId: client.userId,
        });
      } else {
        client.emit('node-lock-failed', {
          nodeId: data.nodeId,
          lockedBy: result.lockedBy,
        });
      }
    } catch (error: any) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('unlock-node')
  handleUnlockNode(
    @ConnectedSocket() client: CollaborationClient,
    @MessageBody() data: { nodeId: string },
  ) {
    if (!client.sessionId || !client.userId) return;

    try {
      this.collaborationService.unlockNode(
        client.sessionId,
        client.userId,
        data.nodeId,
      );

      // Notify all participants
      this.server.to(client.sessionId).emit('node-unlocked', {
        nodeId: data.nodeId,
        userId: client.userId,
      });
    } catch (error: any) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('apply-change')
  handleApplyChange(
    @ConnectedSocket() client: CollaborationClient,
    @MessageBody() data: { type: string; data: any },
  ) {
    if (!client.sessionId || !client.userId) return;

    try {
      const change = this.collaborationService.applyChange(
        client.sessionId,
        client.userId,
        {
          type: data.type as any,
          data: data.data,
        },
      );

      // Broadcast change to other participants
      client.to(client.sessionId).emit('change-applied', {
        changeId: change.id,
        type: change.type,
        data: change.data,
        userId: change.userId,
        timestamp: change.timestamp,
      });

      // Acknowledge to sender
      client.emit('change-acknowledged', {
        changeId: change.id,
      });
    } catch (error: any) {
      client.emit('change-failed', { message: error.message });
    }
  }

  @SubscribeMessage('sync-workflow')
  handleSyncWorkflow(
    @ConnectedSocket() client: CollaborationClient,
    @MessageBody() data: { workflow: any },
  ) {
    if (!client.sessionId || !client.userId) return;

    try {
      this.collaborationService.syncWorkflow(client.sessionId, data.workflow);
      
      // Broadcast sync to other participants
      client.to(client.sessionId).emit('workflow-synced', {
        workflow: data.workflow,
        syncedBy: client.userId,
      });
    } catch (error: any) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('request-state')
  handleRequestState(@ConnectedSocket() client: CollaborationClient) {
    if (!client.sessionId) return;

    try {
      const session = this.collaborationService.getSession(client.sessionId);
      if (session) {
        client.emit('state-update', {
          participants: Array.from(session.participants.values()),
          workflow: session.currentWorkflow,
          locks: Array.from(session.locks.entries()),
          changes: session.changes.slice(-20),
        });
      }
    } catch (error: any) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: CollaborationClient) {
    client.emit('heartbeat-ack');
  }
}

