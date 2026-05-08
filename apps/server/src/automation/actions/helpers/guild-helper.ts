import { PrismaService } from '../../../prisma/prisma.service';
import { DiscordService } from '../../../discord/discord.service';
import { WorkflowContext } from '../../interfaces/action.interface';

/**
 * Helper to get Discord guild from workflow context
 */
export async function getGuildFromContext(
  context: WorkflowContext,
  prisma: PrismaService,
  discordService: DiscordService,
): Promise<{ dbGuild: any; discordGuild: any } | null> {
  if (!context.guildId) {
    return null;
  }

  const dbGuild = await prisma.guild.findUnique({
    where: { id: context.guildId },
  });

  if (!dbGuild) {
    return null;
  }

  const discordGuild = await discordService.getGuild(dbGuild.discordGuildId);
  if (!discordGuild) {
    return null;
  }

  return { dbGuild, discordGuild };
}

