import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscordService } from '../discord/discord.service';

@Injectable()
export class AutoModService {
  private readonly logger = new Logger(AutoModService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly discordService: DiscordService,
  ) {}

  async getRules(guildId: string) {
    return this.prisma.autoModRule.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRule(guildId: string, data: any) {
    return this.prisma.autoModRule.create({
      data: {
        guildId,
        ...data,
      },
    });
  }

  async updateRule(guildId: string, ruleId: string, data: any) {
    return this.prisma.autoModRule.update({
      where: { id: ruleId, guildId },
      data,
    });
  }

  async deleteRule(guildId: string, ruleId: string) {
    return this.prisma.autoModRule.delete({
      where: { id: ruleId, guildId },
    });
  }

  /**
   * Scan message content
   */
  async scanMessage(
    guildId: string,
    messageId: string,
    userId: string,
    channelId: string,
    content: string,
  ) {
    const rules = await this.getRules(guildId);
    const results = [];

    for (const rule of rules) {
      if (!rule.enabled) {
        continue;
      }

      // Check if rule applies to this channel
      if (rule.channels.length > 0 && !rule.channels.includes(channelId)) {
        continue;
      }

      // Check if user is exempt
      const user = await this.prisma.user.findFirst({
        where: { guildId, discordId: userId },
      });

      if (user && rule.exemptUsers.includes(userId)) {
        continue;
      }

      // Perform scan based on rule type
      let flagged = false;
      let confidence = 0.0;

      switch (rule.type) {
        case 'spam':
          flagged = this.detectSpam(content, rule.config);
          confidence = flagged ? 0.8 : 0.0;
          break;
        case 'mention':
          flagged = this.detectExcessiveMentions(content, rule.config);
          confidence = flagged ? 0.7 : 0.0;
          break;
        case 'link':
          flagged = this.detectLinks(content, rule.config);
          confidence = flagged ? 0.6 : 0.0;
          break;
        case 'toxicity':
          flagged = await this.detectToxicity(content);
          confidence = flagged ? 0.85 : 0.0;
          break;
        case 'nsfw':
          flagged = await this.detectNSFW(content);
          confidence = flagged ? 0.9 : 0.0;
          break;
        case 'scam':
          flagged = this.detectScam(content);
          confidence = flagged ? 0.75 : 0.0;
          break;
        case 'phishing':
          flagged = this.detectPhishing(content);
          confidence = flagged ? 0.8 : 0.0;
          break;
      }

      if (flagged) {
        // Record scan
        const scan = await this.prisma.contentScan.create({
          data: {
            guildId,
            ruleId: rule.id,
            messageId,
            userId: user?.id || '',
            channelId,
            content,
            scanType: rule.type,
            confidence,
            flagged: true,
          },
        });

        // Check for repeated offenders
        await this.handleRepeatedOffender(guildId, rule.id, user?.id || '', userId);

        results.push({ rule, scan, flagged: true });
      }
    }

    return results;
  }

  /**
   * Handle repeated offender escalation
   */
  async handleRepeatedOffender(guildId: string, ruleId: string, userId: string, discordUserId: string) {
    let offender = await this.prisma.offenderRecord.findUnique({
      where: {
        guildId_ruleId_userId: {
          guildId,
          ruleId,
          userId,
        },
      },
    });

    if (!offender) {
      offender = await this.prisma.offenderRecord.create({
        data: {
          guildId,
          ruleId,
          userId,
          discordUserId,
          violationCount: 1,
        },
      });
    } else {
      offender = await this.prisma.offenderRecord.update({
        where: { id: offender.id },
        data: {
          violationCount: { increment: 1 },
          lastViolationAt: new Date(),
        },
      });
    }

    const rule = await this.prisma.autoModRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) return;

    // Check if threshold exceeded
    if (offender.violationCount >= rule.threshold && !offender.escalated) {
      await this.prisma.offenderRecord.update({
        where: { id: offender.id },
        data: {
          escalated: true,
          escalationLevel: Math.floor(offender.violationCount / rule.threshold),
        },
      });

      // Execute action
      await this.executeAction(guildId, rule, offender);
    }

    return offender;
  }

  /**
   * Execute auto-mod action
   */
  private async executeAction(guildId: string, rule: any, offender: any) {
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!guild) return;

    const discordGuild = await this.discordService.getGuild(guild.discordGuildId);
    if (!discordGuild) return;

    const member = await discordGuild.members.fetch(offender.discordUserId).catch(() => null);
    if (!member) return;

    switch (rule.action) {
      case 'warn':
        // Create incident or send DM
        this.logger.log(`Auto-mod: Warning ${offender.discordUserId} for ${rule.type}`);
        break;
      case 'delete':
        // Message already deleted if detected
        break;
      case 'timeout':
        await member.timeout(rule.actionDuration || 3600 * 1000, `Auto-mod: ${rule.type}`);
        break;
      case 'kick':
        await member.kick(`Auto-mod: ${rule.type} (${offender.violationCount} violations)`);
        break;
      case 'ban':
        await member.ban({ reason: `Auto-mod: ${rule.type} (${offender.violationCount} violations)` });
        break;
    }
  }

  // Detection methods (simplified - would use ML/AI in production)
  private detectSpam(content: string, config: any): boolean {
    // Simple spam detection: repeated characters, excessive caps, etc.
    const repeatedChars = /(.)\1{4,}/.test(content);
    const excessiveCaps = (content.match(/[A-Z]/g) || []).length / content.length > 0.7;
    return repeatedChars || excessiveCaps;
  }

  private detectExcessiveMentions(content: string, config: any): boolean {
    const mentionCount = (content.match(/<@!?\d+>/g) || []).length;
    return mentionCount > (config?.maxMentions || 5);
  }

  private detectLinks(content: string, config: any): boolean {
    const linkPattern = /https?:\/\/[^\s]+/gi;
    const links = content.match(linkPattern) || [];
    return links.length > (config?.maxLinks || 3);
  }

  private async detectToxicity(content: string): Promise<boolean> {
    // Placeholder - would use ML model or API
    const toxicWords = ['hate', 'kill', 'die']; // Simplified
    return toxicWords.some((word) => content.toLowerCase().includes(word));
  }

  private async detectNSFW(content: string): Promise<boolean> {
    // Placeholder - would use ML model or API
    return false;
  }

  private detectScam(content: string): boolean {
    const scamPatterns = [
      /free.*money/i,
      /click.*here.*now/i,
      /limited.*time/i,
      /act.*now/i,
    ];
    return scamPatterns.some((pattern) => pattern.test(content));
  }

  private detectPhishing(content: string): boolean {
    const phishingPatterns = [
      /verify.*account/i,
      /suspended.*account/i,
      /click.*link.*verify/i,
    ];
    return phishingPatterns.some((pattern) => pattern.test(content));
  }
}

