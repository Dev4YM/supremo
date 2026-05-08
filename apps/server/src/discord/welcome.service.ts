import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { GuildMember } from 'discord.js';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { DiscordService } from './discord.service';

@Injectable()
export class WelcomeService {
  private readonly logger = new Logger(WelcomeService.name);
  private antiRaidService: any; // Lazy injection to avoid circular dependency
  private onboardingService: any; // Lazy injection to avoid circular dependency

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigurationService,
    private readonly discordService: DiscordService,
  ) {}

  setAntiRaidService(service: any) {
    this.antiRaidService = service;
  }

  setOnboardingService(service: any) {
    this.onboardingService = service;
  }

  async handleMemberJoin(member: GuildMember): Promise<void> {
    try {
      if (!member.guild) return;

      // Get or create guild record
      const guild = await this.prisma.guild.findUnique({
        where: { discordGuildId: member.guild.id },
      });

      if (!guild) {
        this.logger.warn(`Guild ${member.guild.id} not found in database, skipping welcome`);
        return;
      }

      // B1: Anti-Raid checks
      if (this.antiRaidService) {
        try {
          // Check join rate limit
          const rateCheck = await this.antiRaidService.checkJoinRate(guild.id, member.guild.id);
          if (!rateCheck.allowed) {
            this.logger.warn(
              `Join rate limit exceeded for guild ${member.guild.id}. Kicking member ${member.user.id}`,
            );
            await member.kick('Join rate limit exceeded');
            return;
          }

          // Check account age gate
          const ageCheck = await this.antiRaidService.checkAccountAge(guild.id, member.user.id);
          if (!ageCheck.allowed) {
            this.logger.warn(
              `Account age gate failed for user ${member.user.id}. Account age: ${ageCheck.accountAge} days, required: ${ageCheck.required} days`,
            );
            await member.kick(`Account too new (${ageCheck.accountAge} days old, minimum ${ageCheck.required} days)`);
            return;
          }

          // Check lockdown mode
          const lockdown = await this.antiRaidService.getLockdownState(guild.id);
          if (lockdown?.enabled) {
            this.logger.warn(`Guild ${member.guild.id} is in lockdown mode. Kicking member ${member.user.id}`);
            await member.kick(lockdown.reason || 'Server is in lockdown mode');
            return;
          }

          // Increment join count
          await this.antiRaidService.incrementJoinCount(guild.id);

          // Get config for verification check
          const config = await this.antiRaidService.getConfig(guild.id);

          // Create verification flow if enabled
          if (config.verificationEnabled) {
            const user = await this.usersService.ensureUserExists(guild.id, {
              discordId: member.user.id,
              username: member.user.username,
              discriminator: member.user.discriminator,
              avatar: member.user.avatar,
            });

            await this.antiRaidService.createVerificationFlow(
              guild.id,
              user.id,
              member.user.id,
            );
            // Verification flow will be handled by frontend/Discord interactions
          }
        } catch (error) {
          this.logger.error(`Error in anti-raid checks for ${member.user.id}:`, error);
          // Continue with normal flow if anti-raid check fails
        }
      }

      // Ensure user exists
      await this.usersService.ensureUserExists(guild.id, {
        discordId: member.user.id,
        username: member.user.username,
        discriminator: member.user.discriminator,
        avatar: member.user.avatar,
      });

      // B5: Onboarding - Handle member join
      if (this.onboardingService) {
        try {
          const user = await this.usersService.ensureUserExists(guild.id, {
            discordId: member.user.id,
            username: member.user.username,
            discriminator: member.user.discriminator,
            avatar: member.user.avatar,
          });
          await this.onboardingService.handleMemberJoin(guild.id, member.user.id, user.id);
        } catch (error) {
          this.logger.error(`Error in onboarding for ${member.user.id}:`, error);
        }
      }

      // Send welcome message if enabled
      await this.sendWelcomeMessage(member, guild.id);
    } catch (error) {
      this.logger.error(`Error handling member join for ${member.user.id}:`, error);
    }
  }

  private async sendWelcomeMessage(member: GuildMember, guildId: string): Promise<void> {
    try {
      const welcomeMessage = await this.configService.getStaticMessage(guildId, 'welcome');
      
      if (!welcomeMessage || !welcomeMessage.enabled) {
        return;
      }

      const channelId = welcomeMessage.channelId;
      if (!channelId) {
        this.logger.warn('Welcome message enabled but no channel configured');
        return;
      }

      const channel = await this.discordService.getChannel(channelId);
      if (!channel) {
        this.logger.warn(`Welcome channel ${channelId} not found`);
        return;
      }

      // Replace placeholders
      const content = welcomeMessage.content
        .replace('{user}', `<@${member.user.id}>`)
        .replace('{username}', member.user.username)
        .replace('{guild}', member.guild.name);

      await channel.send(content);
      
      // Update last sent timestamp
      await this.prisma.staticMessage.update({
        where: {
          guildId_key: {
            guildId,
            key: 'welcome',
          },
        },
        data: { lastSentAt: new Date() },
      });

      this.logger.log(`Sent welcome message for ${member.user.username}`);
    } catch (error) {
      this.logger.error('Error sending welcome message:', error);
    }
  }
}

