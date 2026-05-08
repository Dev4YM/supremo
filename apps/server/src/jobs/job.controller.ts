import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JobSchedulerService } from './job-scheduler.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { PermissionGuard, RequirePermission } from '../auth/guards/permission.guard';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { ApiGuildResponses } from '../common/decorators/api-response.decorator';
import { ApiGuildParam } from '../common/decorators/api-param.decorator';

@ApiTags('jobs')
@Controller('api/jobs')
@UseGuards(SessionGuard, GuildGuard, PermissionGuard)
export class JobController {
  constructor(
    private prisma: PrismaService,
    private jobScheduler: JobSchedulerService,
    private auditService: AuditService,
  ) {}

  @Get()
  @RequirePermission('AUTOMATIONS_VIEW')
  async findAll(@Query('enabled') enabled: string | undefined, @CurrentGuild() guildId: string) {
    const where: any = { guildId };
    if (enabled === 'true' || enabled === 'false') {
      where.enabled = enabled === 'true';
    }
    return this.prisma.job.findMany({
      where,
      include: { automation: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  @RequirePermission('AUTOMATIONS_VIEW')
  async findOne(@Param('id') id: string, @CurrentGuild() guildId: string) {
    return this.prisma.job.findFirst({
      where: { id, guildId },
      include: { automation: true },
    });
  }

  @Post()
  @RequirePermission('AUTOMATIONS_CREATE')
  async create(
    @Body() body: any,
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    // Verify automation belongs to guild
    const automation = await this.prisma.automation.findFirst({
      where: { id: body.automationId, guildId },
    });

    if (!automation) {
      throw new Error('Automation not found');
    }

    const job = await this.prisma.job.create({
      data: {
        guildId,
        automationId: body.automationId,
        name: body.name,
        schedule: body.schedule,
        enabled: body.enabled !== undefined ? body.enabled : true,
        timezone: body.timezone || 'UTC',
        config: body.config ? JSON.stringify(body.config) : null,
      },
    });

    if (job.enabled) {
      await this.jobScheduler.scheduleJob(job.id);
    }

    await this.auditService.log({
      guildId,
      botUserId,
      action: 'JOB_CREATE',
      entityType: 'Job',
      entityId: job.id,
      newValue: job,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return job;
  }

  @Put(':id')
  @RequirePermission('AUTOMATIONS_EDIT')
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const oldJob = await this.prisma.job.findFirst({
      where: { id, guildId },
    });

    if (!oldJob) {
      throw new Error('Job not found');
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.schedule !== undefined) updateData.schedule = body.schedule;
    if (body.enabled !== undefined) updateData.enabled = body.enabled;
    if (body.timezone !== undefined) updateData.timezone = body.timezone;
    if (body.config !== undefined) {
      updateData.config = body.config ? JSON.stringify(body.config) : null;
    }

    const job = await this.prisma.job.update({
      where: { id },
      data: updateData,
    });

    // Reschedule if enabled
    if (job.enabled) {
      await this.jobScheduler.scheduleJob(job.id);
    } else {
      await this.jobScheduler.unscheduleJob(job.id);
    }

    await this.auditService.log({
      guildId,
      botUserId,
      action: 'JOB_UPDATE',
      entityType: 'Job',
      entityId: id,
      oldValue: oldJob,
      newValue: job,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return job;
  }

  @Delete(':id')
  @RequirePermission('AUTOMATIONS_DELETE')
  async delete(
    @Param('id') id: string,
    @CurrentGuild() guildId: string,
    @CurrentUser() botUserId: string,
    @Req() req: any,
  ) {
    const job = await this.prisma.job.findFirst({
      where: { id, guildId },
    });

    if (!job) {
      throw new Error('Job not found');
    }

    await this.jobScheduler.unscheduleJob(id);
    await this.prisma.job.delete({
      where: { id },
    });

    await this.auditService.log({
      guildId,
      botUserId,
      action: 'JOB_DELETE',
      entityType: 'Job',
      entityId: id,
      oldValue: job,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return { success: true };
  }

  @Post(':id/trigger')
  @RequirePermission('AUTOMATIONS_RUN')
  async trigger(@Param('id') id: string, @CurrentGuild() guildId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id, guildId },
    });

    if (!job) {
      throw new Error('Job not found');
    }

    await this.jobScheduler.triggerJob(id, 'manual');
    return { success: true, message: 'Job triggered' };
  }

  @Get(':id/runs')
  @RequirePermission('AUTOMATIONS_VIEW')
  async getRuns(@Param('id') id: string, @Query('limit') limit: string | undefined, @CurrentGuild() guildId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id, guildId },
    });

    if (!job) {
      throw new Error('Job not found');
    }

    return this.prisma.jobRun.findMany({
      where: { jobId: id },
      orderBy: { startedAt: 'desc' },
      take: limit ? parseInt(limit) : 50,
    });
  }
}
