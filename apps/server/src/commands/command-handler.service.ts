import { Injectable, Logger } from '@nestjs/common';
import { Client, CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { CommandsService } from './commands.service';
import { DiscordService } from '../discord/discord.service';
import { ActionsService } from '../actions/actions.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommandHandlerService {
  private readonly logger = new Logger(CommandHandlerService.name);

  constructor(
    private readonly commandsService: CommandsService,
    private readonly discordService: DiscordService,
    private readonly actionsService: ActionsService,
    private readonly prisma: PrismaService,
  ) {}

  async registerCommands() {
    const client = this.discordService.client;
    const guilds = await this.prisma.guild.findMany();
    
    for (const dbGuild of guilds) {
      const commands = await this.commandsService.getAll({
        guildId: dbGuild.id,
        enabled: true,
      });

    const slashCommands = commands.map((cmd) => {
      const builder = new SlashCommandBuilder()
        .setName(cmd.name)
        .setDescription(cmd.description);

      // Add options based on action type
      const config = JSON.parse(cmd.actionConfig);
      
      if (cmd.action === 'kick' || cmd.action === 'ban' || cmd.action === 'timeout' || cmd.action === 'warn') {
        builder.addUserOption((option) =>
          option.setName('user').setDescription('Target user').setRequired(true)
        );
        builder.addStringOption((option) =>
          option.setName('reason').setDescription('Reason for action').setRequired(false)
        );
      }

      if (cmd.action === 'timeout') {
        builder.addIntegerOption((option) =>
          option
            .setName('duration')
            .setDescription('Timeout duration in minutes')
            .setRequired(true)
        );
      }

      if (cmd.action === 'message') {
        builder.addStringOption((option) =>
          option.setName('content').setDescription('Message content').setRequired(true)
        );
      }

      return builder.toJSON();
    });

      try {
        if (client.user && slashCommands.length > 0) {
          const discordGuild = await client.guilds.fetch(dbGuild.discordGuildId);
          await discordGuild.commands.set(slashCommands);
          this.logger.log(`Registered ${slashCommands.length} slash commands to guild ${dbGuild.discordGuildId}`);
        }
      } catch (error) {
        this.logger.error(`Failed to register commands for guild ${dbGuild.discordGuildId}:`, error);
      }
    }
  }

  async handleCommand(interaction: CommandInteraction) {
    try {
      if (!interaction.guild) {
        await interaction.reply({ content: 'Commands can only be used in servers.', ephemeral: true });
        return;
      }

      // Get guild from database
      const dbGuild = await this.prisma.guild.findUnique({
        where: { discordGuildId: interaction.guild.id },
      });

      if (!dbGuild) {
        await interaction.reply({ content: 'Guild not configured. Please contact an administrator.', ephemeral: true });
        return;
      }

      const command = await this.commandsService.getByName(interaction.commandName, dbGuild.id);
      
      // Verify command belongs to this guild
      if (command && command.guildId !== dbGuild.id) {
        await interaction.reply({ content: 'Command not available in this server.', ephemeral: true });
        return;
      }
      
      if (!command || !command.enabled) {
        await interaction.reply({ content: 'This command is currently disabled.', ephemeral: true });
        return;
      }

      // Check permissions
      const member = await interaction.guild?.members.fetch(interaction.user.id);
      const userRoles = member?.roles.cache.map((r) => r.id) || [];
      
      const hasPermission = await this.commandsService.checkPermission(command.id, userRoles);
      
      if (!hasPermission) {
        await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        
        // Get guild from database
        const dbGuild = await this.prisma.guild.findUnique({
          where: { discordGuildId: interaction.guildId! },
        });

        if (dbGuild) {
          await this.commandsService.logExecution({
            commandId: command.id,
            userId: interaction.user.id,
            userName: interaction.user.username,
            guildId: dbGuild.id,
            channelId: interaction.channelId,
            success: false,
            error: 'Permission denied',
          });
        }
        
        return;
      }

      // Execute command based on action type
      const config = JSON.parse(command.actionConfig);
      let result: any;

      switch (command.action) {
        case 'kick':
          result = await this.executeKick(interaction, config);
          break;
        case 'ban':
          result = await this.executeBan(interaction, config);
          break;
        case 'timeout':
          result = await this.executeTimeout(interaction, config);
          break;
        case 'warn':
          result = await this.executeWarn(interaction, config);
          break;
        case 'message':
          result = await this.executeMessage(interaction, config);
          break;
        default:
          await interaction.reply({ content: 'Unknown command action.', ephemeral: true });
          return;
      }

      // Log execution
      const dbGuildForLog = await this.prisma.guild.findUnique({
        where: { discordGuildId: interaction.guildId! },
      });

      if (dbGuildForLog) {
        await this.commandsService.logExecution({
          commandId: command.id,
          userId: interaction.user.id,
          userName: interaction.user.username,
          guildId: dbGuildForLog.id,
          channelId: interaction.channelId,
          args: interaction.isChatInputCommand() ? { options: interaction.options.data } : {},
          success: result.success,
          error: result.error,
        });
      }

    } catch (error: any) {
      this.logger.error('Command execution failed', error);
      
      if (!interaction.replied) {
        await interaction.reply({ content: 'Command execution failed.', ephemeral: true });
      }
    }
  }

  private async executeKick(interaction: CommandInteraction, config: any) {
    if (!interaction.isChatInputCommand()) return { success: false, error: 'Invalid interaction type' };
    
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      const member = await interaction.guild?.members.fetch(user.id);
      if (!member) {
        await interaction.reply({ content: 'User not found in this server.', ephemeral: true });
        return { success: false, error: 'User not found' };
      }

      await member.kick(reason);
      await interaction.reply({ content: `Successfully kicked ${user.tag}. Reason: ${reason}` });
      
      return { success: true };
    } catch (error: any) {
      await interaction.reply({ content: `Failed to kick user: ${error.message}`, ephemeral: true });
      return { success: false, error: error.message };
    }
  }

  private async executeBan(interaction: CommandInteraction, config: any) {
    if (!interaction.isChatInputCommand()) return { success: false, error: 'Invalid interaction type' };
    
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      await interaction.guild?.members.ban(user.id, { reason });
      await interaction.reply({ content: `Successfully banned ${user.tag}. Reason: ${reason}` });
      
      return { success: true };
    } catch (error: any) {
      await interaction.reply({ content: `Failed to ban user: ${error.message}`, ephemeral: true });
      return { success: false, error: error.message };
    }
  }

  private async executeTimeout(interaction: CommandInteraction, config: any) {
    if (!interaction.isChatInputCommand()) return { success: false, error: 'Invalid interaction type' };
    
    const user = interaction.options.getUser('user', true);
    const duration = interaction.options.getInteger('duration', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      const member = await interaction.guild?.members.fetch(user.id);
      if (!member) {
        await interaction.reply({ content: 'User not found in this server.', ephemeral: true });
        return { success: false, error: 'User not found' };
      }

      await member.timeout(duration * 60 * 1000, reason);
      await interaction.reply({ content: `Successfully timed out ${user.tag} for ${duration} minutes. Reason: ${reason}` });
      
      return { success: true };
    } catch (error: any) {
      await interaction.reply({ content: `Failed to timeout user: ${error.message}`, ephemeral: true });
      return { success: false, error: error.message };
    }
  }

  private async executeWarn(interaction: CommandInteraction, config: any) {
    if (!interaction.isChatInputCommand()) return { success: false, error: 'Invalid interaction type' };
    
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      // Get guild from database
      const guild = await this.prisma.guild.findUnique({
        where: { discordGuildId: interaction.guildId! },
      });

      if (!guild) {
        await interaction.reply({ content: 'Guild not found in database', ephemeral: true });
        return { success: false, error: 'Guild not found' };
      }

      // Log the warning action
      await this.actionsService.executeAction({
        userId: user.id,
        actionType: 'warn',
        reason,
        executor: interaction.user.id,
        guildId: guild.id,
      });

      // Send DM to user if configured
      if (config.sendDM) {
        try {
          await user.send(`You have been warned in ${interaction.guild?.name}. Reason: ${reason}`);
        } catch (e) {
          this.logger.warn(`Could not DM user ${user.id}`);
        }
      }

      await interaction.reply({ content: `Successfully warned ${user.tag}. Reason: ${reason}` });
      return { success: true };
    } catch (error: any) {
      await interaction.reply({ content: `Failed to warn user: ${error.message}`, ephemeral: true });
      return { success: false, error: error.message };
    }
  }

  private async executeMessage(interaction: CommandInteraction, config: any) {
    if (!interaction.isChatInputCommand()) return { success: false, error: 'Invalid interaction type' };
    
    const content = interaction.options.getString('content', true);

    try {
      await interaction.reply(content);
      return { success: true };
    } catch (error: any) {
      await interaction.reply({ content: `Failed to send message: ${error.message}`, ephemeral: true });
      return { success: false, error: error.message };
    }
  }
}

