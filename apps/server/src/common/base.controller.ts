import { Logger } from '@nestjs/common';

export abstract class BaseController {
  protected readonly logger: Logger;

  constructor(protected readonly controllerName: string) {
    this.logger = new Logger(controllerName);
  }

  protected success<T>(data: T, message?: string) {
    return {
      success: true,
      data,
      ...(message && { message }),
    };
  }

  protected paginated<T>(
    data: T[],
    total: number,
    page: number = 1,
    limit: number = 10,
  ) {
    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  protected async validateGuild(guildId: string, prisma: any) {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!guild) {
      throw new Error(`Guild ${guildId} not found`);
    }

    return guild;
  }
}

