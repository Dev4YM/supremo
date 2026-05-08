import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as cron from 'node-cron';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowEngineService } from '../automation/workflow-engine.service';
import { WorkflowContext } from '../automation/interfaces/action.interface';
// @ts-ignore - cron-parser types may be incomplete
const cronParser = require('cron-parser');
const parseExpression = cronParser.default || cronParser.parseExpression || cronParser;

@Injectable()
export class JobSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobSchedulerService.name);
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private runningJobs: Set<string> = new Set();

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  async onModuleInit() {
    await this.loadJobs();
    this.logger.log('Job scheduler initialized');
  }

  onModuleDestroy() {
    this.jobs.forEach((task) => task.stop());
    this.jobs.clear();
    this.logger.log('Job scheduler stopped');
  }

  async loadJobs() {
    try {
      // Jobs are guild-specific, so we can't load them globally on startup
      // They will be loaded per-guild when needed
      // For now, skip loading jobs on startup to avoid errors during migration
      this.logger.log('Job scheduler initialized (jobs will be loaded per-guild when needed)');
    } catch (error: any) {
      // Handle case where guildId column might not exist yet (during migration)
      if (error?.code === 'P2022' || error?.message?.includes('guildId')) {
        this.logger.warn('Jobs table may need migration - skipping job loading');
        this.logger.warn('Run: npx prisma db push --accept-data-loss');
      } else {
        this.logger.error('Failed to load jobs:', error);
      }
    }
  }

  async scheduleJob(jobId: string): Promise<void> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { automation: true },
    });

    if (!job || !job.enabled) {
      return;
    }

    // Stop existing job if any
    this.unscheduleJob(jobId);

    try {
      // Validate cron expression
      parseExpression(job.schedule);

      const task = cron.schedule(
        job.schedule,
        async () => {
          await this.executeJob(jobId);
        },
        {
          timezone: job.timezone || 'UTC',
        },
      );

      this.jobs.set(jobId, task);

      // Calculate next run time
      const interval = parseExpression(job.schedule, {
        tz: job.timezone || 'UTC',
      });
      const nextRunAt = interval.next().toDate();

      await this.prisma.job.update({
        where: { id: jobId },
        data: { nextRunAt },
      });

      this.logger.log(`Scheduled job ${job.name} (${jobId}) - Next run: ${nextRunAt.toISOString()}`);
    } catch (error: any) {
      this.logger.error(`Failed to schedule job ${jobId}:`, error);
    }
  }

  async unscheduleJob(jobId: string): Promise<void> {
    const task = this.jobs.get(jobId);
    if (task) {
      task.stop();
      this.jobs.delete(jobId);
      this.logger.log(`Unscheduled job ${jobId}`);
    }
  }

  async executeJob(jobId: string): Promise<void> {
    if (this.runningJobs.has(jobId)) {
      this.logger.warn(`Job ${jobId} is already running, skipping`);
      return;
    }

    this.runningJobs.add(jobId);

    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { automation: true },
    });

    if (!job) {
      this.runningJobs.delete(jobId);
      return;
    }

    const jobRun = await this.prisma.jobRun.create({
      data: {
        jobId,
        automationId: job.automationId,
        status: 'running',
        triggeredBy: 'schedule',
      },
    });

    const startTime = Date.now();

    try {
      // Build context from job config
      const jobConfig = job.config ? JSON.parse(job.config) : {};
      const context: WorkflowContext = {
        variables: jobConfig.variables || {},
        trigger: {
          type: 'scheduled',
          timestamp: new Date(),
        },
        automation: job.automation ? {
          id: job.automation.id,
          name: job.automation.name,
        } : undefined,
      };

      let result;
      if (job.automationId) {
        const automation = await this.prisma.automation.findUnique({ where: { id: job.automationId } });
        if (automation) {
          const workflow = JSON.parse(automation.workflow);
          result = await this.workflowEngine.executeWorkflow(workflow, context, job.automationId, 'schedule');
        } else {
          result = { success: false, results: {}, error: 'Automation not found' };
        }
      } else {
        this.logger.warn(`Job ${jobId} has no associated automation`);
        result = { success: false, results: {}, error: 'No automation associated' };
      }

      const duration = Date.now() - startTime;

      await this.prisma.jobRun.update({
        where: { id: jobRun.id },
        data: {
          status: result.success ? 'success' : 'failed',
          completedAt: new Date(),
          duration,
          output: JSON.stringify(result.results),
          error: result.error,
        },
      });

      await this.prisma.job.update({
        where: { id: jobId },
        data: { lastRunAt: new Date() },
      });

      // Calculate next run time
      const interval = parseExpression(job.schedule, {
        tz: job.timezone || 'UTC',
      });
      const nextRunAt = interval.next().toDate();

      await this.prisma.job.update({
        where: { id: jobId },
        data: { nextRunAt },
      });

      this.logger.log(`Job ${job.name} (${jobId}) completed in ${duration}ms`);
    } catch (error: any) {
      const duration = Date.now() - startTime;

      await this.prisma.jobRun.update({
        where: { id: jobRun.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          duration,
          error: error.message || 'Unknown error',
        },
      });

      this.logger.error(`Job ${jobId} failed:`, error);
    } finally {
      this.runningJobs.delete(jobId);
    }
  }

  async triggerJob(jobId: string, triggeredBy: string = 'manual'): Promise<void> {
    await this.executeJob(jobId);
  }
}

