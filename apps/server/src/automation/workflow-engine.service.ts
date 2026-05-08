import { Injectable, Logger } from '@nestjs/common';
import { ActionRegistryService } from './actions/action-registry.service';
import { WorkflowResilienceService } from './workflow-resilience.service';
import { WorkflowContext, ActionBlock, WorkflowDefinition, ActionResult } from './interfaces/action.interface';
import { PrismaService } from '../prisma/prisma.service';
import { SchemaValidatorService } from './schema-validator.service';

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private readonly actionRegistry: ActionRegistryService,
    private readonly prisma: PrismaService,
    private readonly schemaValidator: SchemaValidatorService,
    private readonly resilience: WorkflowResilienceService,
  ) {}

  async executeWorkflow(
    workflow: WorkflowDefinition,
    context: WorkflowContext,
    automationId?: string,
    triggeredBy: string = 'manual',
  ): Promise<{ success: boolean; results: Record<string, ActionResult>; error?: string; runId?: string }> {
    const results: Record<string, ActionResult> = {};
    const executedBlocks = new Set<string>();
    let currentBlockId = workflow.entryPoint || workflow.blocks[0]?.id;
    const startTime = Date.now();
    let runId: string | undefined;

    if (!currentBlockId) {
      return { success: false, results, error: 'No entry point defined' };
    }

    if (automationId) {
      try {
        const run = await this.prisma.automationRun.create({
          data: {
            automationId,
            status: 'running',
            triggeredBy,
            context: JSON.stringify(context),
            startedAt: new Date(),
          },
        });
        runId = run.id;
      } catch (error) {
        this.logger.warn('Failed to create automation run log:', error);
      }
    }

    try {
      while (currentBlockId) {
        // Prevent infinite loops
        if (executedBlocks.has(currentBlockId)) {
          this.logger.warn(`Circular reference detected at block ${currentBlockId}`);
          break;
        }

        const block = workflow.blocks.find((b) => b.id === currentBlockId);
        if (!block) {
          this.logger.warn(`Block ${currentBlockId} not found`);
          break;
        }

        executedBlocks.add(currentBlockId);
        this.logger.debug(`Executing block ${currentBlockId} (${block.type})`);

        // Validate block config before execution
        const action = this.actionRegistry.getAction(block.type);
        if (action) {
          const schema = action.getConfigSchema();
          const validation = this.schemaValidator.validateConfig(schema, block.config || {});
          if (!validation.valid) {
            this.logger.error(`Invalid config for block ${currentBlockId}:`, validation.errors);
            results[block.id] = {
              success: false,
              error: `Invalid configuration: ${validation.errors?.join(', ')}`,
            };
            currentBlockId = block.onFailure;
            if (!currentBlockId) break;
            continue;
          }
        }

        // Handle wait action
        if (block.wait && block.wait > 0) {
          await new Promise((resolve) => setTimeout(resolve, block.wait));
        }

        // Generate cache key for this block
        const cacheKey = this.resilience.generateCacheKey(block.id, block.config || {}, context);

        // Execute action with resilience features
        const result = await this.executeBlockWithResilience(
          block,
          context,
          cacheKey,
          automationId,
        );

        results[block.id] = result;

        // Update context with result data
        if (result.success && result.data) {
          context.variables = {
            ...context.variables,
            [`${block.id}_result`]: result.data,
            ...result.data,
          };
        }

        // Determine next block based on result
        if (block.type === 'condition') {
          // Condition blocks return result.evaluated as boolean
          const conditionResult = result.success && result.data?.result;
          currentBlockId = conditionResult ? block.onTrue : block.onFalse;
        } else {
          // Regular blocks use onSuccess/onFailure
          if (result.success) {
            currentBlockId = block.onSuccess;
          } else {
            currentBlockId = block.onFailure;
            if (block.onFailure) {
              this.logger.warn(`Block ${currentBlockId} failed, moving to failure handler`);
            } else {
              // No failure handler, stop execution
              this.logger.error(`Block ${currentBlockId} failed with no failure handler`);
              break;
            }
          }
        }

        // If no next block, end workflow
        if (!currentBlockId) {
          break;
        }
      }

      const allSuccessful = Object.values(results).every((r) => r.success);
      const duration = Date.now() - startTime;

      // Update run log
      if (runId) {
        try {
          await this.prisma.automationRun.update({
            where: { id: runId },
            data: {
              status: allSuccessful ? 'success' : 'failed',
              completedAt: new Date(),
              duration,
              results: JSON.stringify(results),
            },
          });
        } catch (error) {
          this.logger.warn('Failed to update automation run log:', error);
        }
      }

      return { success: allSuccessful, results, runId };
    } catch (error: any) {
      this.logger.error(`Workflow execution error:`, error);
      const duration = Date.now() - startTime;

      // Update run log with error
      if (runId) {
        try {
          await this.prisma.automationRun.update({
            where: { id: runId },
            data: {
              status: 'failed',
              completedAt: new Date(),
              duration,
              error: error.message || 'Unknown workflow error',
              results: JSON.stringify(results),
            },
          });
        } catch (updateError) {
          this.logger.warn('Failed to update automation run log:', updateError);
        }
      }

      return {
        success: false,
        results,
        error: error.message || 'Unknown workflow error',
        runId,
      };
    }
  }

  async executeAutomation(
    automationId: string,
    context: WorkflowContext,
  ): Promise<{ success: boolean; results: Record<string, ActionResult>; error?: string }> {
    const automation = await this.prisma.automation.findUnique({
      where: { id: automationId },
    });

    if (!automation) {
      return {
        success: false,
        results: {},
        error: 'Automation not found',
      };
    }

    if (!automation.enabled) {
      return {
        success: false,
        results: {},
        error: 'Automation is disabled',
      };
    }

    // Parse workflow from JSON
    let workflow: WorkflowDefinition;
    try {
      workflow = JSON.parse(automation.workflow);
    } catch (error) {
      return {
        success: false,
        results: {},
        error: 'Invalid workflow JSON',
      };
    }

    // Add automation metadata to context
    context.automation = {
      id: automation.id,
      name: automation.name,
    };

    return this.executeWorkflow(workflow, context, automationId, 'trigger');
  }

  async testWorkflow(
    workflow: WorkflowDefinition,
    context: WorkflowContext,
  ): Promise<{ success: boolean; results: Record<string, ActionResult>; error?: string }> {
    // Dry run - execute but don't persist anything
    this.logger.log('Running workflow test (dry run)');
    return this.executeWorkflow(workflow, context);
  }

  async validateWorkflow(workflow: WorkflowDefinition): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    // Validate entry point exists
    if (!workflow.entryPoint) {
      errors.push('Workflow must have an entryPoint');
    } else {
      const entryBlock = workflow.blocks.find((b) => b.id === workflow.entryPoint);
      if (!entryBlock) {
        errors.push(`Entry point block "${workflow.entryPoint}" not found`);
      }
    }

    // Validate all blocks
    for (const block of workflow.blocks) {
      const action = this.actionRegistry.getAction(block.type);
      if (!action) {
        errors.push(`Block "${block.id}": Unknown action type "${block.type}"`);
        continue;
      }

      // Validate config schema
      const schema = action.getConfigSchema();
      const validation = this.schemaValidator.validateConfig(schema, block.config || {});
      if (!validation.valid) {
        errors.push(`Block "${block.id}": ${validation.errors?.join(', ')}`);
      }

      // Validate block references
      if (block.onSuccess) {
        const targetBlock = workflow.blocks.find((b) => b.id === block.onSuccess);
        if (!targetBlock) {
          errors.push(`Block "${block.id}": onSuccess references non-existent block "${block.onSuccess}"`);
        }
      }
      if (block.onFailure) {
        const targetBlock = workflow.blocks.find((b) => b.id === block.onFailure);
        if (!targetBlock) {
          errors.push(`Block "${block.id}": onFailure references non-existent block "${block.onFailure}"`);
        }
      }
      if (block.onTrue) {
        const targetBlock = workflow.blocks.find((b) => b.id === block.onTrue);
        if (!targetBlock) {
          errors.push(`Block "${block.id}": onTrue references non-existent block "${block.onTrue}"`);
        }
      }
      if (block.onFalse) {
        const targetBlock = workflow.blocks.find((b) => b.id === block.onFalse);
        if (!targetBlock) {
          errors.push(`Block "${block.id}": onFalse references non-existent block "${block.onFalse}"`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Execute block with retry, caching, and circuit breaker
   */
  private async executeBlockWithResilience(
    block: ActionBlock,
    context: WorkflowContext,
    cacheKey: string,
    automationId?: string,
  ): Promise<ActionResult> {
    // Check cache first (only for read-only actions)
    const readOnlyActions = ['condition', 'wait', 'custom_code'];
    if (readOnlyActions.includes(block.type)) {
      const cached = this.resilience.getCachedResult(cacheKey);
      if (cached) {
        this.logger.debug(`Using cached result for block ${block.id}`);
        return cached;
      }
    }

    // Define retry policy
    const retryPolicy = {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'Rate limit'],
    };

    // Define circuit breaker config
    const circuitBreakerConfig = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
    };

    // Execute with resilience
    try {
      const result = await this.resilience.executeWithCircuitBreaker(
        async () => {
          return await this.resilience.executeWithRetry(
            async () => {
              return await this.resilience.executeWithTimeout(
                async () => {
                  return await this.actionRegistry.executeAction(
                    block.type,
                    context,
                    block.config || {},
                  );
                },
                30000, // 30 second timeout
                block.id,
              );
            },
            retryPolicy,
            block.id,
          );
        },
        block.id,
        circuitBreakerConfig,
      );

      // Cache successful read-only results
      if (result.success && readOnlyActions.includes(block.type)) {
        this.resilience.cacheResult(cacheKey, result, 300000); // 5 minute TTL
      }

      // Save checkpoint after successful critical blocks
      if (result.success && automationId && this.isCriticalBlock(block)) {
        await this.resilience.saveCheckpoint(automationId, block.id, context);
      }

      return result;
    } catch (error: any) {
      this.logger.error(`Failed to execute block ${block.id} after all retry attempts:`, error);
      return {
        success: false,
        error: error.message || 'Unknown error',
        metadata: { blockId: block.id, originalError: error.toString() },
      };
    }
  }

  /**
   * Check if block is critical (should save checkpoint)
   */
  private isCriticalBlock(block: ActionBlock): boolean {
    const criticalActions = [
      'create_incident',
      'timeout',
      'warn',
      'add_role',
      'remove_role',
      'create_channel',
      'update_trust_score',
    ];
    return criticalActions.includes(block.type);
  }
}

