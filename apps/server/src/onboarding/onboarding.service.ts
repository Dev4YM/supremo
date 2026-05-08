import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscordService } from '../discord/discord.service';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly discordService: DiscordService,
  ) {}

  async getFlow(guildId: string) {
    let flow = await this.prisma.onboardingFlow.findUnique({
      where: { guildId },
      include: {
        welcomeMessages: true,
        questions: { orderBy: { order: 'asc' } },
        dmSequences: { orderBy: { order: 'asc' } },
        stagedPermissions: { orderBy: { stage: 'asc' } },
        reactionRoles: true,
        roleMenus: true,
      },
    });

    if (!flow) {
      flow = await this.prisma.onboardingFlow.create({
        data: {
          guildId,
          enabled: true,
          welcomeEnabled: true,
          rulesEnabled: false,
          questionsEnabled: false,
          dmSequenceEnabled: false,
        },
        include: {
          welcomeMessages: true,
          questions: true,
          dmSequences: true,
          stagedPermissions: true,
          reactionRoles: true,
          roleMenus: true,
        },
      });
    }

    return flow;
  }

  /**
   * Update onboarding flow
   */
  async updateFlow(guildId: string, data: Partial<any>) {
    await this.getFlow(guildId); // Ensure flow exists

    return this.prisma.onboardingFlow.update({
      where: { guildId },
      data,
    });
  }

  /**
   * Handle member join - send welcome and start onboarding
   */
  async handleMemberJoin(guildId: string, discordUserId: string, userId: string) {
    const flow = await this.getFlow(guildId);

    if (!flow.enabled) {
      return;
    }

    // Send welcome message
    if (flow.welcomeEnabled) {
      await this.sendWelcomeMessage(guildId, discordUserId);
    }

    // Send rules for acceptance
    if (flow.rulesEnabled) {
      await this.sendRulesForAcceptance(guildId, discordUserId, userId);
    }

    // Send onboarding questions
    if (flow.questionsEnabled && flow.questions.length > 0) {
      await this.sendOnboardingQuestions(guildId, discordUserId, userId);
    }

    // Start DM sequence
    if (flow.dmSequenceEnabled && flow.dmSequences.length > 0) {
      await this.startDMSequence(guildId, discordUserId, flow.dmSequences);
    }

    // Apply staged permissions
    if (flow.stagedPermissions.length > 0) {
      await this.applyStagedPermissions(guildId, discordUserId, userId, flow.stagedPermissions);
    }
  }

  /**
   * Send welcome message
   */
  private async sendWelcomeMessage(guildId: string, discordUserId: string) {
    const flow = await this.getFlow(guildId);
    const welcomeMessages = flow.welcomeMessages.filter((m) => m.enabled);

    if (welcomeMessages.length === 0) {
      return;
    }

    const guild = await this.prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return;

    const discordGuild = await this.discordService.getGuild(guild.discordGuildId);
    if (!discordGuild) return;

    for (const message of welcomeMessages) {
      try {
        const channel = await this.discordService.getChannel(message.channelId);
        if (!channel || !channel.isTextBased()) continue;

        let content = message.content;
        content = content.replace('{user}', `<@${discordUserId}>`);

        if (message.embedConfig) {
          const embed = JSON.parse(message.embedConfig);
          await channel.send({ content, embeds: [embed] });
        } else {
          await channel.send(content);
        }
      } catch (error) {
        this.logger.error(`Error sending welcome message: ${error}`);
      }
    }
  }

  /**
   * Send rules for acceptance
   */
  private async sendRulesForAcceptance(
    guildId: string,
    discordUserId: string,
    userId: string,
  ) {
    const flow = await this.getFlow(guildId);
    const rulesAcceptance = await this.prisma.rulesAcceptance.findUnique({
      where: { guildId_userId: { guildId, userId } },
    });

    if (rulesAcceptance && rulesAcceptance.accepted) {
      return; // Already accepted
    }

    const guild = await this.prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return;

    const discordGuild = await this.discordService.getGuild(guild.discordGuildId);
    if (!discordGuild) return;

    const member = await discordGuild.members.fetch(discordUserId).catch(() => null);
    if (!member) return;

    // Send rules via DM
    const rulesText = rulesAcceptance?.rulesText || 'Please read and accept the server rules.';
    
    try {
      await member.send(`**Server Rules**\n\n${rulesText}\n\nReact with ✅ to accept.`);
    } catch (error) {
      this.logger.error(`Error sending rules: ${error}`);
    }
  }

  /**
   * Send onboarding questions
   */
  private async sendOnboardingQuestions(
    guildId: string,
    discordUserId: string,
    userId: string,
  ) {
    const flow = await this.getFlow(guildId);
    const questions = flow.questions;

    if (questions.length === 0) {
      return;
    }

    const guild = await this.prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return;

    const discordGuild = await this.discordService.getGuild(guild.discordGuildId);
    if (!discordGuild) return;

    const member = await discordGuild.members.fetch(discordUserId).catch(() => null);
    if (!member) return;

    // Send questions via DM
    try {
      let message = '**Onboarding Questions**\n\n';
      questions.forEach((q, index) => {
        message += `${index + 1}. ${q.question}\n`;
        if (q.type === 'multiple_choice' && q.options) {
          const options = JSON.parse(q.options);
          options.forEach((opt: string, i: number) => {
            message += `   ${i + 1}. ${opt}\n`;
          });
        }
        message += '\n';
      });

      await member.send(message);
    } catch (error) {
      this.logger.error(`Error sending onboarding questions: ${error}`);
    }
  }

  /**
   * Start DM sequence
   */
  private async startDMSequence(
    guildId: string,
    discordUserId: string,
    sequences: any[],
  ) {
    const guild = await this.prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return;

    const discordGuild = await this.discordService.getGuild(guild.discordGuildId);
    if (!discordGuild) return;

    const member = await discordGuild.members.fetch(discordUserId).catch(() => null);
    if (!member) return;

    let delay = 0;
    for (const sequence of sequences) {
      if (!sequence.enabled) continue;

      setTimeout(async () => {
        try {
          await member.send(sequence.content);
        } catch (error) {
          this.logger.error(`Error sending DM sequence: ${error}`);
        }
      }, delay * 1000);

      delay += sequence.delay;
    }
  }

  /**
   * Apply staged permissions
   */
  private async applyStagedPermissions(
    guildId: string,
    discordUserId: string,
    userId: string,
    stages: any[],
  ) {
    const guild = await this.prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return;

    const discordGuild = await this.discordService.getGuild(guild.discordGuildId);
    if (!discordGuild) return;

    const member = await discordGuild.members.fetch(discordUserId).catch(() => null);
    if (!member) return;

    // Apply first stage immediately
    const firstStage = stages[0];
    if (firstStage && firstStage.delay === 0) {
      try {
        await member.roles.add(firstStage.roleId);
      } catch (error) {
        this.logger.error(`Error applying staged permission: ${error}`);
      }
    }

    // Schedule other stages
    for (let i = 1; i < stages.length; i++) {
      const stage = stages[i];
      const delayMs = stage.delay * 24 * 60 * 60 * 1000; // Convert days to ms

      setTimeout(async () => {
        try {
          await member.roles.add(stage.roleId);
        } catch (error) {
          this.logger.error(`Error applying staged permission: ${error}`);
        }
      }, delayMs);
    }
  }

  /**
   * Create welcome message
   */
  async createWelcomeMessage(guildId: string, data: any) {
    const flow = await this.getFlow(guildId);

    return this.prisma.welcomeMessage.create({
      data: {
        guildId,
        flowId: flow.id,
        ...data,
      },
    });
  }

  /**
   * Create onboarding question
   */
  async createQuestion(guildId: string, data: any) {
    const flow = await this.getFlow(guildId);

    return this.prisma.onboardingQuestion.create({
      data: {
        guildId,
        flowId: flow.id,
        ...data,
      },
    });
  }

  /**
   * Create DM sequence
   */
  async createDMSequence(guildId: string, data: any) {
    const flow = await this.getFlow(guildId);

    return this.prisma.dMSequence.create({
      data: {
        guildId,
        flowId: flow.id,
        ...data,
      },
    });
  }

  /**
   * Create reaction role
   */
  async createReactionRole(guildId: string, data: any) {
    return this.prisma.reactionRole.create({
      data: {
        guildId,
        ...data,
      },
    });
  }

  /**
   * Create role menu
   */
  async createRoleMenu(guildId: string, data: any) {
    return this.prisma.roleMenu.create({
      data: {
        guildId,
        ...data,
      },
    });
  }

  /**
   * Create temporary role
   */
  async createTemporaryRole(
    guildId: string,
    userId: string,
    roleId: string,
    durationDays: number,
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    return this.prisma.temporaryRole.create({
      data: {
        guildId,
        userId,
        roleId,
        expiresAt,
      },
    });
  }

  /**
   * Check and revoke expired temporary roles
   */
  async checkExpiredTemporaryRoles(guildId: string) {
    const expired = await this.prisma.temporaryRole.findMany({
      where: {
        guildId,
        expiresAt: { lte: new Date() },
        revokedAt: null,
      },
    });

    const guild = await this.prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return { revoked: 0 };

    const discordGuild = await this.discordService.getGuild(guild.discordGuildId);
    if (!discordGuild) return { revoked: 0 };

    let revoked = 0;
    for (const tempRole of expired) {
      try {
        const member = await discordGuild.members.fetch(tempRole.userId).catch(() => null);
        if (member) {
          await member.roles.remove(tempRole.roleId);
        }

        await this.prisma.temporaryRole.update({
          where: { id: tempRole.id },
          data: { revokedAt: new Date() },
        });

        revoked++;
      } catch (error) {
        this.logger.error(`Error revoking temporary role: ${error}`);
      }
    }

    return { revoked };
  }
}

