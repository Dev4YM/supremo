import { Injectable, Logger } from '@nestjs/common';
import { WorkflowContext, ActionResult, WorkflowDefinition } from './interfaces/action.interface';

export interface RetryPolicy {
  maxAttempts: number;
  initialDelay: number; // milliseconds
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors?: string[]; // Error messages that should trigger retry
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes to close
  timeout: number; // Time in ms before attempting reset
}

export interface WorkflowCache {
  key: string;
  result: ActionResult;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

@Injectable()
export class WorkflowResilienceService {
  private readonly logger = new Logger(WorkflowResilienceService.name);
  private cache: Map<string, WorkflowCache> = new Map();
  private circuitBreakers: Map<string, {
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    successes: number;
    lastFailure: number;
    config: CircuitBreakerConfig;
  }> = new Map();

  constructor() {
    // Cleanup expired cache entries every minute
    setInterval(() => this.cleanupCache(), 60000);
  }

  /**
   * Execute action with retry logic
   */
  async executeWithRetry<T>(
    actionFn: () => Promise<T>,
    policy: RetryPolicy,
    actionId: string,
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = policy.initialDelay;

    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
      try {
        this.logger.debug(`Attempt ${attempt}/${policy.maxAttempts} for action ${actionId}`);
        const result = await actionFn();
        
        if (attempt > 1) {
          this.logger.log(`Action ${actionId} succeeded after ${attempt} attempts`);
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        this.logger.warn(`Action ${actionId} failed (attempt ${attempt}): ${error.message}`);

        // Check if error is retryable
        if (policy.retryableErrors && policy.retryableErrors.length > 0) {
          const isRetryable = policy.retryableErrors.some((pattern) =>
            error.message.includes(pattern)
          );
          if (!isRetryable) {
            throw error;
          }
        }

        // Don't wait on last attempt
        if (attempt < policy.maxAttempts) {
          await this.sleep(delay);
          delay = Math.min(delay * policy.backoffMultiplier, policy.maxDelay);
        }
      }
    }

    throw lastError || new Error('Max retry attempts exceeded');
  }

  /**
   * Execute with circuit breaker pattern
   */
  async executeWithCircuitBreaker<T>(
    actionFn: () => Promise<T>,
    actionId: string,
    config: CircuitBreakerConfig,
  ): Promise<T> {
    const breaker = this.getOrCreateCircuitBreaker(actionId, config);

    // Check circuit state
    if (breaker.state === 'open') {
      const timeSinceLastFailure = Date.now() - breaker.lastFailure;
      
      if (timeSinceLastFailure < config.timeout) {
        throw new Error(`Circuit breaker is OPEN for action ${actionId}`);
      } else {
        // Attempt to half-open
        breaker.state = 'half-open';
        breaker.successes = 0;
        this.logger.log(`Circuit breaker HALF-OPEN for action ${actionId}`);
      }
    }

    try {
      const result = await actionFn();
      
      // Success - update breaker
      breaker.successes++;
      breaker.failures = 0;

      if (breaker.state === 'half-open' && breaker.successes >= config.successThreshold) {
        breaker.state = 'closed';
        this.logger.log(`Circuit breaker CLOSED for action ${actionId}`);
      }

      return result;
    } catch (error: any) {
      // Failure - update breaker
      breaker.failures++;
      breaker.lastFailure = Date.now();
      breaker.successes = 0;

      if (breaker.failures >= config.failureThreshold) {
        breaker.state = 'open';
        this.logger.warn(`Circuit breaker OPEN for action ${actionId} after ${breaker.failures} failures`);
      }

      throw error;
    }
  }

  /**
   * Cache workflow results
   */
  cacheResult(key: string, result: ActionResult, ttl: number = 300000): void {
    this.cache.set(key, {
      key,
      result,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Get cached result
   */
  getCachedResult(key: string): ActionResult | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp;
    if (age > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    this.logger.debug(`Cache hit for key: ${key}`);
    return cached.result;
  }

  /**
   * Generate cache key from context and config
   */
  generateCacheKey(blockId: string, config: any, context: Partial<WorkflowContext>): string {
    const configStr = JSON.stringify(config);
    const contextStr = JSON.stringify({
      user: context.user?.discordId,
      channel: context.channel?.id,
      guild: context.guild?.id,
    });
    
    return `${blockId}:${this.hashString(configStr + contextStr)}`;
  }

  /**
   * Execute with caching
   */
  async executeWithCache<T extends ActionResult>(
    actionFn: () => Promise<T>,
    cacheKey: string,
    ttl: number = 300000,
  ): Promise<T> {
    // Check cache first
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached as T;
    }

    // Execute and cache
    const result = await actionFn();
    this.cacheResult(cacheKey, result, ttl);
    
    return result;
  }

  /**
   * Graceful degradation - execute with fallback
   */
  async executeWithFallback<T>(
    primaryFn: () => Promise<T>,
    fallbackFn: () => Promise<T>,
    actionId: string,
  ): Promise<T> {
    try {
      return await primaryFn();
    } catch (error: any) {
      this.logger.warn(`Primary action ${actionId} failed, using fallback: ${error.message}`);
      return await fallbackFn();
    }
  }

  /**
   * Execute with timeout
   */
  async executeWithTimeout<T>(
    actionFn: () => Promise<T>,
    timeoutMs: number,
    actionId: string,
  ): Promise<T> {
    return Promise.race([
      actionFn(),
      this.createTimeoutPromise<T>(timeoutMs, actionId),
    ]) as Promise<T>;
  }

  /**
   * Batch recovery - recover failed workflow from checkpoint
   */
  async recoverFromCheckpoint(
    workflow: WorkflowDefinition,
    checkpointBlockId: string,
    context: WorkflowContext,
  ): Promise<{
    resumeBlockId: string;
    preservedContext: WorkflowContext;
  }> {
    this.logger.log(`Recovering workflow from checkpoint: ${checkpointBlockId}`);

    // Find the checkpoint block
    const checkpointBlock = workflow.blocks.find((b) => b.id === checkpointBlockId);
    if (!checkpointBlock) {
      throw new Error(`Checkpoint block not found: ${checkpointBlockId}`);
    }

    // Determine resume point (typically the next block after checkpoint)
    const resumeBlockId = checkpointBlock.onSuccess || checkpointBlock.onTrue;
    if (!resumeBlockId) {
      throw new Error('No continuation from checkpoint block');
    }

    return {
      resumeBlockId,
      preservedContext: context,
    };
  }

  /**
   * Save workflow checkpoint
   */
  async saveCheckpoint(
    workflowId: string,
    blockId: string,
    context: WorkflowContext,
  ): Promise<void> {
    const checkpointKey = `checkpoint:${workflowId}`;
    this.cacheResult(
      checkpointKey,
      {
        success: true,
        data: {
          blockId,
          context,
          timestamp: Date.now(),
        },
      },
      3600000, // 1 hour TTL
    );

    this.logger.debug(`Saved checkpoint for workflow ${workflowId} at block ${blockId}`);
  }

  /**
   * Load workflow checkpoint
   */
  async loadCheckpoint(workflowId: string): Promise<{
    blockId: string;
    context: WorkflowContext;
    timestamp: number;
  } | null> {
    const checkpointKey = `checkpoint:${workflowId}`;
    const cached = this.getCachedResult(checkpointKey);

    if (!cached || !cached.data) {
      return null;
    }

    return cached.data;
  }

  /**
   * Clear workflow checkpoint
   */
  clearCheckpoint(workflowId: string): void {
    const checkpointKey = `checkpoint:${workflowId}`;
    this.cache.delete(checkpointKey);
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(actionId: string): {
    state: string;
    failures: number;
    successes: number;
  } | null {
    const breaker = this.circuitBreakers.get(actionId);
    if (!breaker) {
      return null;
    }

    return {
      state: breaker.state,
      failures: breaker.failures,
      successes: breaker.successes,
    };
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(actionId: string): void {
    this.circuitBreakers.delete(actionId);
    this.logger.log(`Reset circuit breaker for action ${actionId}`);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('Cleared all cache');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.values()).map((entry) => ({
      key: entry.key,
      age: now - entry.timestamp,
      ttl: entry.ttl,
    }));

    return {
      size: this.cache.size,
      entries,
    };
  }

  // Private helper methods

  private getOrCreateCircuitBreaker(actionId: string, config: CircuitBreakerConfig) {
    if (!this.circuitBreakers.has(actionId)) {
      this.circuitBreakers.set(actionId, {
        state: 'closed',
        failures: 0,
        successes: 0,
        lastFailure: 0,
        config,
      });
    }
    return this.circuitBreakers.get(actionId)!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private createTimeoutPromise<T>(ms: number, actionId: string): Promise<T> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Action ${actionId} timed out after ${ms}ms`)), ms)
    );
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private cleanupCache(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.logger.debug(`Cleaned up ${removed} expired cache entries`);
    }
  }
}

