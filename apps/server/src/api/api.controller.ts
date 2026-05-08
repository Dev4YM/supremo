import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { GuildGuard } from '../auth/guards/guild.guard';
import { PermissionGuard, RequirePermission } from '../auth/guards/permission.guard';
import { CurrentGuild } from '../auth/decorators/current-guild.decorator';
import { ApiGuildResponses, ApiStandardResponses } from '../common/decorators/api-response.decorator';
import { ApiGuildParam } from '../common/decorators/api-param.decorator';

@ApiTags('api')
@Controller('api')
export class ApiController {
  constructor(private prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check', description: 'Returns API health status (public endpoint)' })
  @ApiStandardResponses()
  @ApiResponse({ status: 200, description: 'API is healthy' })
  async health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('stats')
  @UseGuards(SessionGuard, GuildGuard, PermissionGuard)
  @RequirePermission('ANALYTICS_VIEW')
  @ApiOperation({ summary: 'Get statistics', description: 'Retrieves server statistics (requires guild)' })
  @ApiGuildParam()
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'Server statistics' })
  async getStats(@CurrentGuild() guildId: string) {
    const [users, incidents, actions, pendingIncidents] = await Promise.all([
      this.prisma.user.count({ where: { guildId } }),
      this.prisma.incident.count({ where: { guildId } }),
      this.prisma.action.count({ where: { guildId } }),
      this.prisma.incident.count({ where: { guildId, status: 'PENDING' } }),
    ]);

    return {
      users,
      incidents,
      actions,
      pendingIncidents,
    };
  }

  @Get('analytics/rules')
  @UseGuards(SessionGuard, GuildGuard, PermissionGuard)
  @RequirePermission('ANALYTICS_VIEW')
  @ApiOperation({ summary: 'Get rule analytics', description: 'Retrieves analytics for auto-mod rules (requires guild)' })
  @ApiGuildParam()
  @ApiGuildResponses()
  @ApiResponse({ status: 200, description: 'Rule analytics' })
  async getRuleAnalytics(@CurrentGuild() guildId: string) {
    const incidents = await this.prisma.incident.groupBy({
      by: ['ruleTriggered'],
      where: { guildId },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    return incidents.map((item) => ({
      rule: item.ruleTriggered,
      count: item._count.id,
    }));
  }

  @Get('analytics/automations')
  @UseGuards(SessionGuard, GuildGuard, PermissionGuard)
  @RequirePermission('ANALYTICS_VIEW')
  @ApiGuildParam()
  @ApiGuildResponses()
  async getAutomationAnalytics(@CurrentGuild() guildId: string) {
    const [automations, enabledAutomations, jobRuns] = await Promise.all([
      this.prisma.automation.count({ where: { guildId } }),
      this.prisma.automation.count({ where: { guildId, enabled: true } }),
      this.prisma.jobRun.findMany({
        where: {
          job: {
            guildId,
          },
        },
        take: 100,
        orderBy: { startedAt: 'desc' },
      }),
    ]);

    const successfulRuns = jobRuns.filter((r) => r.status === 'success').length;
    const failedRuns = jobRuns.filter((r) => r.status === 'failed').length;
    const totalDuration = jobRuns
      .filter((r) => r.duration)
      .reduce((sum, r) => sum + (r.duration || 0), 0);
    const avgDuration = jobRuns.filter((r) => r.duration).length > 0
      ? totalDuration / jobRuns.filter((r) => r.duration).length
      : 0;

    // Most triggered automations
    const automationRuns = await this.prisma.jobRun.groupBy({
      by: ['automationId'],
      _count: { id: true },
      where: {
        job: {
          guildId,
        },
        automationId: { not: null },
      },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const topAutomations = await Promise.all(
      automationRuns.map(async (item) => {
        if (!item.automationId) return null;
        const automation = await this.prisma.automation.findFirst({
          where: { id: item.automationId, guildId },
        });
        return automation
          ? { name: automation.name, count: item._count.id }
          : null;
      }),
    );

    return {
      totalAutomations: automations,
      enabledAutomations,
      totalRuns: jobRuns.length,
      successfulRuns,
      failedRuns,
      successRate: jobRuns.length > 0 ? (successfulRuns / jobRuns.length) * 100 : 0,
      avgDuration,
      topAutomations: topAutomations.filter((a) => a !== null),
    };
  }

  @Get('analytics/automations/performance')
  @UseGuards(SessionGuard, GuildGuard, PermissionGuard)
  @RequirePermission('ANALYTICS_VIEW')
  @ApiGuildParam()
  @ApiGuildResponses()
  async getAutomationPerformance(@CurrentGuild() guildId: string) {
    // Get automation runs with performance metrics
    const automationRuns = await this.prisma.automationRun.findMany({
      where: {
        automation: {
          guildId,
        },
      },
      take: 100,
      orderBy: { startedAt: 'desc' },
      include: {
        automation: {
          select: {
            id: true,
            name: true,
            type: true,
            enabled: true,
          },
        },
      },
    });

    // Group by automation
    const performanceByAutomation: Record<string, any> = {};

    automationRuns.forEach((run) => {
      const automationId = run.automationId;
      if (!automationId || !run.automation) return;

      if (!performanceByAutomation[automationId]) {
        performanceByAutomation[automationId] = {
          id: automationId,
          name: run.automation.name,
          type: run.automation.type,
          enabled: run.automation.enabled,
          totalRuns: 0,
          successfulRuns: 0,
          failedRuns: 0,
          runningRuns: 0,
          totalDuration: 0,
          durations: [],
        };
      }

      const perf = performanceByAutomation[automationId];
      perf.totalRuns++;

      if (run.status === 'SUCCESS') {
        perf.successfulRuns++;
      } else if (run.status === 'FAILED') {
        perf.failedRuns++;
      } else if (run.status === 'RUNNING') {
        perf.runningRuns++;
      }

      if (run.duration) {
        perf.totalDuration += run.duration;
        perf.durations.push(run.duration);
      }
    });

    // Calculate statistics
    const performanceData = Object.values(performanceByAutomation).map((perf: any) => {
      const avgDuration = perf.durations.length > 0
        ? perf.totalDuration / perf.durations.length
        : 0;
      
      const sortedDurations = perf.durations.sort((a: number, b: number) => a - b);
      const medianDuration = sortedDurations.length > 0
        ? sortedDurations[Math.floor(sortedDurations.length / 2)]
        : 0;
      
      const minDuration = sortedDurations.length > 0 ? sortedDurations[0] : 0;
      const maxDuration = sortedDurations.length > 0 
        ? sortedDurations[sortedDurations.length - 1] 
        : 0;

      const successRate = perf.totalRuns > 0
        ? (perf.successfulRuns / perf.totalRuns) * 100
        : 0;

      return {
        id: perf.id,
        name: perf.name,
        type: perf.type,
        enabled: perf.enabled,
        totalRuns: perf.totalRuns,
        successfulRuns: perf.successfulRuns,
        failedRuns: perf.failedRuns,
        runningRuns: perf.runningRuns,
        successRate: Math.round(successRate * 100) / 100,
        avgDuration: Math.round(avgDuration),
        medianDuration: Math.round(medianDuration),
        minDuration: Math.round(minDuration),
        maxDuration: Math.round(maxDuration),
      };
    });

    // Overall statistics
    const totalRuns = automationRuns.length;
    const successfulRuns = automationRuns.filter((r) => r.status === 'SUCCESS').length;
    const failedRuns = automationRuns.filter((r) => r.status === 'FAILED').length;
    const runningRuns = automationRuns.filter((r) => r.status === 'RUNNING').length;

    const allDurations = automationRuns
      .filter((r) => r.duration)
      .map((r) => r.duration!);
    
    const avgDuration = allDurations.length > 0
      ? allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length
      : 0;

    return {
      overall: {
        totalRuns,
        successfulRuns,
        failedRuns,
        runningRuns,
        successRate: totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0,
        avgDuration: Math.round(avgDuration),
      },
      automations: performanceData.sort((a, b) => b.totalRuns - a.totalRuns),
    };
  }
}

