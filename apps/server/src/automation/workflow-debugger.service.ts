import { Injectable, Logger } from '@nestjs/common';
import { WorkflowContext, ActionResult, WorkflowDefinition, ActionBlock } from './interfaces/action.interface';
import { ActionRegistryService } from './actions/action-registry.service';
import { PrismaService } from '../prisma/prisma.service';

export interface DebugStep {
  blockId: string;
  blockType: string;
  timestamp: number;
  duration: number;
  result: ActionResult;
  context: Partial<WorkflowContext>;
  variables: Record<string, any>;
  nextBlock?: string;
}

export interface WorkflowDebugSession {
  id: string;
  workflowId?: string;
  workflow: WorkflowDefinition;
  steps: DebugStep[];
  breakpoints: Set<string>;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  currentBlockId?: string;
  context: WorkflowContext;
  startTime: number;
  endTime?: number;
}

@Injectable()
export class WorkflowDebuggerService {
  private readonly logger = new Logger(WorkflowDebuggerService.name);
  private debugSessions: Map<string, WorkflowDebugSession> = new Map();

  constructor(
    private actionRegistry: ActionRegistryService,
    private prisma: PrismaService,
  ) {}

  /**
   * Start a new debug session
   */
  startDebugSession(
    workflow: WorkflowDefinition,
    context: WorkflowContext,
    breakpoints: string[] = [],
  ): string {
    const sessionId = `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const session: WorkflowDebugSession = {
      id: sessionId,
      workflow,
      steps: [],
      breakpoints: new Set(breakpoints),
      status: 'idle',
      context: JSON.parse(JSON.stringify(context)),
      startTime: Date.now(),
    };

    this.debugSessions.set(sessionId, session);
    this.logger.log(`Started debug session: ${sessionId}`);
    
    return sessionId;
  }

  /**
   * Execute workflow in debug mode (step-by-step)
   */
  async executeStep(sessionId: string): Promise<{
    step: DebugStep;
    hasNext: boolean;
    session: WorkflowDebugSession;
  }> {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      throw new Error('Debug session not found');
    }

    if (session.status === 'completed' || session.status === 'failed') {
      throw new Error('Debug session already completed');
    }

    // Determine current block
    let currentBlockId = session.currentBlockId;
    if (!currentBlockId) {
      currentBlockId = session.workflow.entryPoint || session.workflow.blocks[0]?.id;
      session.currentBlockId = currentBlockId;
    }

    if (!currentBlockId) {
      session.status = 'completed';
      session.endTime = Date.now();
      return { step: null as any, hasNext: false, session };
    }

    const block = session.workflow.blocks.find((b) => b.id === currentBlockId);
    if (!block) {
      session.status = 'failed';
      session.endTime = Date.now();
      throw new Error(`Block not found: ${currentBlockId}`);
    }

    // Check for circular references
    const executedBlocks = session.steps.map((s) => s.blockId);
    if (executedBlocks.includes(currentBlockId)) {
      this.logger.warn(`Circular reference detected at block ${currentBlockId}`);
      session.status = 'failed';
      session.endTime = Date.now();
      throw new Error('Circular reference detected');
    }

    session.status = 'running';
    const stepStart = Date.now();

    // Execute the block
    const result = await this.actionRegistry.executeAction(
      block.type,
      session.context,
      block.config || {},
    );

    const stepDuration = Date.now() - stepStart;

    // Update context with result
    if (result.success && result.data) {
      session.context.variables = {
        ...session.context.variables,
        [`${block.id}_result`]: result.data,
        ...result.data,
      };
    }

    // Determine next block
    let nextBlockId: string | undefined;
    if (block.type === 'condition') {
      const conditionResult = result.success && result.data?.result;
      nextBlockId = conditionResult ? block.onTrue : block.onFalse;
    } else {
      nextBlockId = result.success ? block.onSuccess : block.onFailure;
    }

    // Create debug step
    const step: DebugStep = {
      blockId: block.id,
      blockType: block.type,
      timestamp: stepStart,
      duration: stepDuration,
      result,
      context: {
        trigger: session.context.trigger,
        guild: session.context.guild,
        channel: session.context.channel,
        user: session.context.user,
      },
      variables: { ...session.context.variables },
      nextBlock: nextBlockId,
    };

    session.steps.push(step);
    session.currentBlockId = nextBlockId;

    // Check if we hit a breakpoint
    if (nextBlockId && session.breakpoints.has(nextBlockId)) {
      session.status = 'paused';
      this.logger.log(`Hit breakpoint at block: ${nextBlockId}`);
    } else if (!nextBlockId) {
      session.status = 'completed';
      session.endTime = Date.now();
    }

    return {
      step,
      hasNext: !!nextBlockId,
      session: this.serializeSession(session),
    };
  }

  /**
   * Execute entire workflow in debug mode
   */
  async executeWorkflowDebug(
    sessionId: string,
    maxSteps: number = 100,
  ): Promise<WorkflowDebugSession> {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      throw new Error('Debug session not found');
    }

    let stepsExecuted = 0;
    while (session.status !== 'completed' && session.status !== 'failed' && stepsExecuted < maxSteps) {
      const { hasNext } = await this.executeStep(sessionId);
      stepsExecuted++;
      
      if (!hasNext) break;
      if (session.status === 'paused') break;
    }

    if (stepsExecuted >= maxSteps) {
      this.logger.warn(`Debug session ${sessionId} exceeded max steps (${maxSteps})`);
      session.status = 'failed';
      session.endTime = Date.now();
    }

    return this.serializeSession(session);
  }

  /**
   * Get debug session
   */
  getDebugSession(sessionId: string): WorkflowDebugSession | null {
    const session = this.debugSessions.get(sessionId);
    return session ? this.serializeSession(session) : null;
  }

  /**
   * Add breakpoint
   */
  addBreakpoint(sessionId: string, blockId: string): void {
    const session = this.debugSessions.get(sessionId);
    if (session) {
      session.breakpoints.add(blockId);
    }
  }

  /**
   * Remove breakpoint
   */
  removeBreakpoint(sessionId: string, blockId: string): void {
    const session = this.debugSessions.get(sessionId);
    if (session) {
      session.breakpoints.delete(blockId);
    }
  }

  /**
   * Continue execution from paused state
   */
  async continueExecution(sessionId: string): Promise<WorkflowDebugSession> {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      throw new Error('Debug session not found');
    }

    if (session.status !== 'paused') {
      throw new Error('Session is not paused');
    }

    session.status = 'idle';
    return this.executeWorkflowDebug(sessionId);
  }

  /**
   * Stop debug session
   */
  stopDebugSession(sessionId: string): void {
    const session = this.debugSessions.get(sessionId);
    if (session) {
      session.status = 'completed';
      session.endTime = Date.now();
    }
  }

  /**
   * Delete debug session
   */
  deleteDebugSession(sessionId: string): void {
    this.debugSessions.delete(sessionId);
    this.logger.log(`Deleted debug session: ${sessionId}`);
  }

  /**
   * Get all active debug sessions
   */
  getActiveSessions(): WorkflowDebugSession[] {
    return Array.from(this.debugSessions.values()).map((s) => this.serializeSession(s));
  }

  /**
   * Analyze workflow performance
   */
  async analyzeWorkflowPerformance(automationId: string, limit: number = 100): Promise<{
    totalRuns: number;
    successRate: number;
    avgDuration: number;
    medianDuration: number;
    minDuration: number;
    maxDuration: number;
    slowestBlocks: Array<{ blockId: string; blockType: string; avgDuration: number }>;
    failureReasons: Array<{ reason: string; count: number }>;
    executionTimeline: Array<{ date: string; runs: number; successRate: number }>;
  }> {
    const runs = await this.prisma.automationRun.findMany({
      where: { automationId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    if (runs.length === 0) {
      return {
        totalRuns: 0,
        successRate: 0,
        avgDuration: 0,
        medianDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        slowestBlocks: [],
        failureReasons: [],
        executionTimeline: [],
      };
    }

    const successfulRuns = runs.filter((r) => r.status === 'success');
    const durations = runs.filter((r) => r.duration).map((r) => r.duration!);
    const sortedDurations = durations.sort((a, b) => a - b);

    // Calculate block-level performance
    const blockStats: Map<string, { durations: number[]; type: string }> = new Map();
    
    for (const run of runs) {
      if (run.results) {
        try {
          const results = JSON.parse(run.results as string);
          // Note: We'd need to store per-block timing in the results
          // For now, this is a placeholder for the structure
          Object.entries(results).forEach(([blockId, result]: [string, any]) => {
            if (!blockStats.has(blockId)) {
              blockStats.set(blockId, { durations: [], type: result.type || 'unknown' });
            }
            // In a full implementation, we'd extract timing from result
          });
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }

    const slowestBlocks = Array.from(blockStats.entries())
      .map(([blockId, stats]) => ({
        blockId,
        blockType: stats.type,
        avgDuration: stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length || 0,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);

    // Analyze failure reasons
    const failureReasons: Map<string, number> = new Map();
    runs
      .filter((r) => r.status === 'failed' && r.error)
      .forEach((r) => {
        const reason = r.error || 'Unknown error';
        failureReasons.set(reason, (failureReasons.get(reason) || 0) + 1);
      });

    // Build execution timeline (group by day)
    const timelineMap: Map<string, { runs: number; successes: number }> = new Map();
    runs.forEach((run) => {
      const date = new Date(run.startedAt).toISOString().split('T')[0];
      const stats = timelineMap.get(date) || { runs: 0, successes: 0 };
      stats.runs++;
      if (run.status === 'success') stats.successes++;
      timelineMap.set(date, stats);
    });

    const executionTimeline = Array.from(timelineMap.entries())
      .map(([date, stats]) => ({
        date,
        runs: stats.runs,
        successRate: (stats.successes / stats.runs) * 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalRuns: runs.length,
      successRate: (successfulRuns.length / runs.length) * 100,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length || 0,
      medianDuration: sortedDurations[Math.floor(sortedDurations.length / 2)] || 0,
      minDuration: sortedDurations[0] || 0,
      maxDuration: sortedDurations[sortedDurations.length - 1] || 0,
      slowestBlocks,
      failureReasons: Array.from(failureReasons.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count),
      executionTimeline,
    };
  }

  /**
   * Validate workflow with detailed analysis
   */
  async validateWorkflowDetailed(workflow: WorkflowDefinition): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
    complexity: {
      nodeCount: number;
      edgeCount: number;
      maxDepth: number;
      cyclomaticComplexity: number;
      estimatedDuration: number;
    };
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate entry point
    if (!workflow.entryPoint) {
      errors.push('Workflow must have an entryPoint');
    } else {
      const entryBlock = workflow.blocks.find((b) => b.id === workflow.entryPoint);
      if (!entryBlock) {
        errors.push(`Entry point block "${workflow.entryPoint}" not found`);
      }
    }

    // Check for unreachable blocks
    const reachable = new Set<string>();
    const queue = [workflow.entryPoint];
    
    while (queue.length > 0) {
      const blockId = queue.shift();
      if (!blockId || reachable.has(blockId)) continue;
      
      reachable.add(blockId);
      const block = workflow.blocks.find((b) => b.id === blockId);
      
      if (block) {
        if (block.onSuccess) queue.push(block.onSuccess);
        if (block.onFailure) queue.push(block.onFailure);
        if (block.onTrue) queue.push(block.onTrue);
        if (block.onFalse) queue.push(block.onFalse);
      }
    }

    const unreachableBlocks = workflow.blocks.filter((b) => !reachable.has(b.id));
    if (unreachableBlocks.length > 0) {
      warnings.push(`${unreachableBlocks.length} unreachable blocks: ${unreachableBlocks.map((b) => b.id).join(', ')}`);
    }

    // Validate all blocks
    let totalEdges = 0;
    let maxDepth = 0;
    let estimatedDuration = 0;

    for (const block of workflow.blocks) {
      const action = this.actionRegistry.getAction(block.type);
      if (!action) {
        errors.push(`Block "${block.id}": Unknown action type "${block.type}"`);
        continue;
      }

      // Validate block references
      const edges = [block.onSuccess, block.onFailure, block.onTrue, block.onFalse].filter(Boolean);
      totalEdges += edges.length;

      for (const target of edges) {
        if (target && !workflow.blocks.find((b) => b.id === target)) {
          errors.push(`Block "${block.id}": References non-existent block "${target}"`);
        }
      }

      // Estimate duration
      if (block.wait) {
        estimatedDuration += block.wait;
      }
      estimatedDuration += 100; // Assume 100ms per action

      // Check for missing failure handlers
      if (!block.onFailure && !block.onFalse) {
        warnings.push(`Block "${block.id}": No failure handler defined`);
      }
    }

    // Calculate cyclomatic complexity
    const cyclomaticComplexity = totalEdges - workflow.blocks.length + 2;

    // Suggestions
    if (workflow.blocks.length > 20) {
      suggestions.push('Consider breaking this workflow into smaller sub-workflows');
    }
    if (cyclomaticComplexity > 10) {
      suggestions.push('High complexity detected. Consider simplifying the workflow logic');
    }
    if (estimatedDuration > 60000) {
      suggestions.push('Workflow may take over 1 minute to execute. Consider optimizing or splitting');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      complexity: {
        nodeCount: workflow.blocks.length,
        edgeCount: totalEdges,
        maxDepth,
        cyclomaticComplexity,
        estimatedDuration,
      },
    };
  }

  /**
   * Serialize session for API response
   */
  private serializeSession(session: WorkflowDebugSession): WorkflowDebugSession {
    return {
      ...session,
      breakpoints: new Set(Array.from(session.breakpoints)),
    };
  }

  /**
   * Cleanup old debug sessions (call periodically)
   */
  cleanupOldSessions(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [sessionId, session] of this.debugSessions.entries()) {
      if (now - session.startTime > maxAge) {
        this.debugSessions.delete(sessionId);
        this.logger.log(`Cleaned up old debug session: ${sessionId}`);
      }
    }
  }
}

