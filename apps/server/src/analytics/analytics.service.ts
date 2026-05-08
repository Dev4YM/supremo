import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordMemberGrowth(guildId: string) {
    const guild = await this.prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get yesterday's metric for comparison
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayMetric = await this.prisma.memberGrowthMetric.findUnique({
      where: {
        guildId_date: {
          guildId,
          date: yesterday,
        },
      },
    });

    // Count current members
    const memberCount = await this.prisma.user.count({
      where: { guildId },
    });

    // Count joins/leaves today
    const joinedToday = await this.prisma.user.count({
      where: {
        guildId,
        joinedAt: {
          gte: today,
        },
      },
    });

    const leftToday = await this.prisma.user.count({
      where: {
        guildId,
        lastActivity: {
          gte: today,
          lt: yesterday,
        },
      },
    });

    const netGrowth = joinedToday - leftToday;
    const previousCount = yesterdayMetric?.memberCount || memberCount - netGrowth;

    return this.prisma.memberGrowthMetric.upsert({
      where: {
        guildId_date: {
          guildId,
          date: today,
        },
      },
      create: {
        guildId,
        date: today,
        memberCount,
        joinedCount: joinedToday,
        leftCount: leftToday,
        netGrowth,
      },
      update: {
        memberCount,
        joinedCount: joinedToday,
        leftCount: leftToday,
        netGrowth,
      },
    });
  }

  /**
   * Record activity metric
   */
  async recordActivity(guildId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeUsers = await this.prisma.user.count({
      where: {
        guildId,
        lastActivity: {
          gte: today,
        },
      },
    });

    const messagesSent = await this.prisma.message.count({
      where: {
        guildId,
        createdAt: {
          gte: today,
        },
      },
    });

    const commandsUsed = await this.prisma.commandLog.count({
      where: {
        guildId,
        executedAt: {
          gte: today,
        },
      },
    });

    const automationsRun = await this.prisma.automationRun.count({
      where: {
        automation: {
          guildId,
        },
        startedAt: {
          gte: today,
        },
      },
    });

    return this.prisma.activityMetric.upsert({
      where: {
        guildId_date: {
          guildId,
          date: today,
        },
      },
      create: {
        guildId,
        date: today,
        activeUsers,
        messagesSent,
        commandsUsed,
        automationsRun,
      },
      update: {
        activeUsers,
        messagesSent,
        commandsUsed,
        automationsRun,
      },
    });
  }

  /**
   * Record engagement heatmap
   */
  async recordEngagementHeatmap(guildId: string, hour: number, channelId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hourStart = new Date(today);
    hourStart.setHours(hour, 0, 0, 0);
    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hour + 1, 0, 0, 0);

    const messageCount = await this.prisma.message.count({
      where: {
        guildId,
        channelId: channelId || undefined,
        createdAt: {
          gte: hourStart,
          lt: hourEnd,
        },
      },
    });

    const userCount = await this.prisma.message.groupBy({
      by: ['userId'],
      where: {
        guildId,
        channelId: channelId || undefined,
        createdAt: {
          gte: hourStart,
          lt: hourEnd,
        },
      },
    }).then((result) => result.length);

    const engagementScore = messageCount * 0.5 + userCount * 0.5;

    const existing = await this.prisma.engagementHeatmap.findFirst({
      where: {
        guildId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
        hour,
        channelId: channelId || null,
      },
    });

    if (existing) {
      return this.prisma.engagementHeatmap.update({
        where: { id: existing.id },
        data: {
          messageCount,
          userCount,
          engagementScore,
        },
      });
    }

    return this.prisma.engagementHeatmap.create({
      data: {
        guildId,
        date: today,
        hour,
        channelId,
        messageCount,
        userCount,
        engagementScore,
      },
    });
  }

  /**
   * Record mod workload metric
   */
  async recordModWorkload(guildId: string, moderatorId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const casesHandled = await this.prisma.case.count({
      where: {
        guildId,
        assignedTo: moderatorId,
        updatedAt: {
          gte: today,
        },
      },
    });

    const actionsTaken = await this.prisma.action.count({
      where: {
        guildId,
        executor: moderatorId,
        executedAt: {
          gte: today,
        },
      },
    });

    // Estimate time spent (rough calculation)
    const timeSpent = casesHandled * 10 + actionsTaken * 2; // minutes

    return this.prisma.modWorkloadMetric.upsert({
      where: {
        guildId_moderatorId_date: {
          guildId,
          moderatorId,
          date: today,
        },
      },
      create: {
        guildId,
        moderatorId,
        date: today,
        casesHandled,
        actionsTaken,
        timeSpent,
      },
      update: {
        casesHandled,
        actionsTaken,
        timeSpent,
      },
    });
  }

  /**
   * Record automation metric
   */
  async recordAutomationMetric(guildId: string, automationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const runs = await this.prisma.automationRun.count({
      where: {
        automationId,
        startedAt: {
          gte: today,
        },
      },
    });

    const successes = await this.prisma.automationRun.count({
      where: {
        automationId,
        status: 'success',
        startedAt: {
          gte: today,
        },
      },
    });

    const failures = await this.prisma.automationRun.count({
      where: {
        automationId,
        status: 'failed',
        startedAt: {
          gte: today,
        },
      },
    });

    const runsWithDuration = await this.prisma.automationRun.findMany({
      where: {
        automationId,
        startedAt: {
          gte: today,
        },
        duration: { not: null },
      },
      select: { duration: true },
    });

    const avgDuration =
      runsWithDuration.length > 0
        ? runsWithDuration.reduce((sum, r) => sum + (r.duration || 0), 0) /
          runsWithDuration.length
        : null;

    const successRate = runs > 0 ? successes / runs : 0.0;

    return this.prisma.automationMetric.upsert({
      where: {
        guildId_automationId_date: {
          guildId,
          automationId,
          date: today,
        },
      },
      create: {
        guildId,
        automationId,
        date: today,
        runs,
        successes,
        failures,
        avgDuration: avgDuration ? Math.round(avgDuration) : null,
        successRate,
      },
      update: {
        runs,
        successes,
        failures,
        avgDuration: avgDuration ? Math.round(avgDuration) : null,
        successRate,
      },
    });
  }

  /**
   * Detect anomalies
   */
  async detectAnomalies(guildId: string) {
    const anomalies: any[] = [];

    // Check for member growth spikes
    const recentGrowth = await this.prisma.memberGrowthMetric.findMany({
      where: { guildId },
      orderBy: { date: 'desc' },
      take: 7,
    });

    if (recentGrowth.length >= 2) {
      const avgGrowth = recentGrowth.reduce((sum, m) => sum + m.netGrowth, 0) / recentGrowth.length;
      const latest = recentGrowth[0];

      if (latest.netGrowth > avgGrowth * 2) {
        anomalies.push({
          type: 'spike',
          metric: 'member_growth',
          value: latest.netGrowth,
          expectedValue: avgGrowth,
          severity: 'high',
          description: `Unusual member growth spike: ${latest.netGrowth} vs average ${avgGrowth.toFixed(1)}`,
        });
      }
    }

    // Check for activity drops
    const recentActivity = await this.prisma.activityMetric.findMany({
      where: { guildId },
      orderBy: { date: 'desc' },
      take: 7,
    });

    if (recentActivity.length >= 2) {
      const avgMessages = recentActivity.reduce((sum, m) => sum + m.messagesSent, 0) / recentActivity.length;
      const latest = recentActivity[0];

      if (latest.messagesSent < avgMessages * 0.5 && latest.messagesSent > 0) {
        anomalies.push({
          type: 'drop',
          metric: 'messages_sent',
          value: latest.messagesSent,
          expectedValue: avgMessages,
          severity: 'medium',
          description: `Significant drop in messages: ${latest.messagesSent} vs average ${avgMessages.toFixed(1)}`,
        });
      }
    }

    // Store anomalies
    for (const anomaly of anomalies) {
      await this.prisma.anomalyAlert.create({
        data: {
          guildId,
          ...anomaly,
        },
      });
    }

    return anomalies;
  }

  /**
   * Get analytics snapshot
   */
  async getSnapshot(guildId: string, snapshotType: 'daily' | 'weekly' | 'monthly') {
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date = now;

    switch (snapshotType) {
      case 'daily':
        periodStart = new Date(now);
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - 7);
        break;
      case 'monthly':
        periodStart = new Date(now);
        periodStart.setMonth(periodStart.getMonth() - 1);
        break;
    }

    const data = {
      memberGrowth: await this.prisma.memberGrowthMetric.findMany({
        where: {
          guildId,
          date: { gte: periodStart, lte: periodEnd },
        },
      }),
      activity: await this.prisma.activityMetric.findMany({
        where: {
          guildId,
          date: { gte: periodStart, lte: periodEnd },
        },
      }),
      engagement: await this.prisma.engagementHeatmap.findMany({
        where: {
          guildId,
          date: { gte: periodStart, lte: periodEnd },
        },
      }),
      modWorkload: await this.prisma.modWorkloadMetric.findMany({
        where: {
          guildId,
          date: { gte: periodStart, lte: periodEnd },
        },
      }),
      automation: await this.prisma.automationMetric.findMany({
        where: {
          guildId,
          date: { gte: periodStart, lte: periodEnd },
        },
      }),
    };

    // Store snapshot
    await this.prisma.analyticsSnapshot.create({
      data: {
        guildId,
        snapshotType,
        periodStart,
        periodEnd,
        data: JSON.stringify(data),
      },
    });

    return data;
  }

  /**
   * Get member growth metrics
   */
  async getMemberGrowth(guildId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    return this.prisma.memberGrowthMetric.findMany({
      where: {
        guildId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Get activity metrics
   */
  async getActivityMetrics(guildId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    return this.prisma.activityMetric.findMany({
      where: {
        guildId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Get engagement heatmap
   */
  async getEngagementHeatmap(guildId: string, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    return this.prisma.engagementHeatmap.findMany({
      where: {
        guildId,
        date: { gte: startDate },
      },
      orderBy: [
        { date: 'asc' },
        { hour: 'asc' },
      ],
    });
  }

  /**
   * Get mod workload metrics
   */
  async getModWorkloadMetrics(guildId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    return this.prisma.modWorkloadMetric.findMany({
      where: {
        guildId,
        date: { gte: startDate },
      },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Get automation metrics
   */
  async getAutomationMetrics(guildId: string, automationId?: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    return this.prisma.automationMetric.findMany({
      where: {
        guildId,
        automationId: automationId || undefined,
        date: { gte: startDate },
      },
      include: {
        automation: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Get anomaly alerts
   */
  async getAnomalyAlerts(guildId: string, acknowledged?: boolean) {
    return this.prisma.anomalyAlert.findMany({
      where: {
        guildId,
        ...(acknowledged !== undefined && { acknowledged }),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Get health metrics for dashboard
   */
  async getHealthMetrics(guildId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get member count
    const memberCount = await this.prisma.user.count({
      where: { guildId },
    });

    // Get messages today
    const messagesToday = await this.prisma.message.count({
      where: {
        guildId,
        createdAt: { gte: today },
      },
    });

    // Get active incidents (pending or reviewing)
    const activeIncidents = await this.prisma.incident.count({
      where: {
        guildId,
        status: { in: ['PENDING', 'REVIEWING'] },
      },
    });

    // Get moderation actions today
    const modActions = await this.prisma.action.count({
      where: {
        guildId,
        executedAt: { gte: today },
      },
    });

    // Calculate trends (compare with yesterday)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const messagesYesterday = await this.prisma.message.count({
      where: {
        guildId,
        createdAt: {
          gte: yesterday,
          lt: today,
        },
      },
    });

    const incidentsYesterday = await this.prisma.incident.count({
      where: {
        guildId,
        createdAt: {
          gte: yesterday,
          lt: today,
        },
      },
    });

    const actionsYesterday = await this.prisma.action.count({
      where: {
        guildId,
        executedAt: {
          gte: yesterday,
          lt: today,
        },
      },
    });

    // Calculate percentage changes
    const messageTrend = messagesYesterday > 0
      ? ((messagesToday - messagesYesterday) / messagesYesterday) * 100
      : messagesToday > 0 ? 100 : 0;

    const incidentTrend = incidentsYesterday > 0
      ? ((activeIncidents - incidentsYesterday) / incidentsYesterday) * 100
      : activeIncidents > 0 ? 100 : 0;

    const actionTrend = actionsYesterday > 0
      ? ((modActions - actionsYesterday) / actionsYesterday) * 100
      : modActions > 0 ? 100 : 0;

    // Get member growth (last 7 days)
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const membersWeekAgo = await this.prisma.user.count({
      where: {
        guildId,
        joinedAt: { lt: weekAgo },
      },
    });
    const memberGrowth = membersWeekAgo > 0
      ? ((memberCount - membersWeekAgo) / membersWeekAgo) * 100
      : memberCount > 0 ? 100 : 0;

    return {
      memberCount,
      memberGrowth,
      messagesToday,
      messageTrend,
      activeIncidents,
      incidentTrend,
      modActions,
      actionTrend,
    };
  }

  /**
   * Daily analytics aggregation (scheduled)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async aggregateDailyAnalytics() {
    this.logger.log('Running daily analytics aggregation...');

    const guilds = await this.prisma.guild.findMany();

    for (const guild of guilds) {
      try {
        await this.recordMemberGrowth(guild.id);
        await this.recordActivity(guild.id);
        await this.detectAnomalies(guild.id);
        await this.getSnapshot(guild.id, 'daily');
      } catch (error) {
        this.logger.error(`Error aggregating analytics for guild ${guild.id}:`, error);
      }
    }

    this.logger.log('Daily analytics aggregation complete');
  }
}

