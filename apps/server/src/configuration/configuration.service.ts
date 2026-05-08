import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConfigurationService {
  private readonly logger = new Logger(ConfigurationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getConfig(guildId: string, key: string): Promise<string | null> {
    const config = await this.prisma.configuration.findFirst({
      where: { guildId, key },
    });
    return config?.value || null;
  }

  async setConfig(guildId: string, key: string, value: string, description?: string, category = 'general') {
    return this.prisma.configuration.upsert({
      where: { guildId_key: { guildId, key } },
      create: {
        guildId,
        key,
        value,
        description,
        category,
      },
      update: {
        value,
        description,
        updatedAt: new Date(),
      },
    });
  }

  async getAllConfigs(guildId: string, category?: string) {
    const where: any = { guildId };
    if (category) {
      where.category = category;
    }
    return this.prisma.configuration.findMany({
      where,
      orderBy: { key: 'asc' },
    });
  }

  async getStaticMessage(guildId: string, key: string) {
    return this.prisma.staticMessage.findFirst({
      where: { guildId, key },
    });
  }

  async setStaticMessage(
    guildId: string,
    key: string,
    content: string,
    channelId?: string,
    enabled = true,
  ) {
    return this.prisma.staticMessage.upsert({
      where: { guildId_key: { guildId, key } },
      create: {
        guildId,
        key,
        content,
        channelId,
        enabled,
      },
      update: {
        content,
        channelId,
        enabled,
        updatedAt: new Date(),
      },
    });
  }

  async getAllStaticMessages(guildId: string) {
    return this.prisma.staticMessage.findMany({
      where: { guildId },
      orderBy: { key: 'asc' },
    });
  }

  async toggleStaticMessage(guildId: string, key: string, enabled: boolean) {
    return this.prisma.staticMessage.updateMany({
      where: { guildId, key },
      data: { enabled },
    });
  }
}

