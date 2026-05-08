import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export abstract class BaseService {
  protected readonly logger: Logger;

  constructor(
    protected readonly serviceName: string,
    protected readonly prisma: PrismaService,
  ) {
    this.logger = new Logger(serviceName);
  }

  protected async ensureExists<T>(
    findFn: () => Promise<T | null>,
    entityName: string,
    identifier: string,
  ): Promise<T> {
    const entity = await findFn();
    if (!entity) {
      throw new NotFoundException(`${entityName} with identifier ${identifier} not found`);
    }
    return entity;
  }

  protected async validateGuild(guildId: string): Promise<void> {
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!guild) {
      throw new NotFoundException(
        `Guild ${guildId} not found. Please connect the guild first via POST /api/guilds/:discordGuildId/connect`
      );
    }
  }

  protected validateRequired<T>(data: Partial<T>, fields: (keyof T)[]): void {
    const missing = fields.filter((field) => !data[field]);
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing required fields: ${missing.join(', ')}`
      );
    }
  }

  protected logOperation(operation: string, context?: Record<string, any>): void {
    if (context) {
      this.logger.log(`${operation} - ${JSON.stringify(context)}`);
    } else {
      this.logger.log(operation);
    }
  }

  protected logError(operation: string, error: Error, context?: Record<string, any>): void {
    const contextStr = context ? JSON.stringify(context) : '';
    this.logger.error(`${operation} failed: ${error.message}`, error.stack, contextStr);
  }
}

