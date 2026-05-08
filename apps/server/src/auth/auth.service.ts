import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {}

  async register(email: string, password: string, username: string) {
    const existing = await this.prisma.botUser.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existing) {
      throw new BadRequestException('User with this email or username already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.botUser.create({
      data: {
        email,
        passwordHash,
        username,
        status: 'active',
      },
    });

    this.logger.log(`New user registered: ${email}`);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
    };
  }

  async login(email: string, password: string, ip?: string, userAgent?: string) {
    const user = await this.prisma.botUser.findUnique({ where: { email } });

    if (!user || user.status !== 'active' || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.botUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const session = await this.sessionService.createSession(user.id, ip, userAgent);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        discordId: user.discordId,
      },
      sessionToken: session.token,
    };
  }

  async discordOAuth(
    discordId: string,
    accessToken: string,
    refreshToken: string,
    expiresAt: Date,
    userData: { username: string; avatar?: string; email?: string },
    ip?: string,
    userAgent?: string,
  ) {
    let user = await this.prisma.botUser.findUnique({ where: { discordId } });

    if (user) {
      // Update existing user's OAuth account
      await this.prisma.oAuthAccount.upsert({
        where: {
          provider_providerAccountId: {
            provider: 'discord',
            providerAccountId: discordId,
          },
        },
        update: {
          accessToken,
          refreshToken,
          expiresAt,
        },
        create: {
          botUserId: user.id,
          provider: 'discord',
          providerAccountId: discordId,
          accessToken,
          refreshToken,
          expiresAt,
        },
      });

      user = await this.prisma.botUser.update({
        where: { id: user.id },
        data: {
          username: userData.username,
          avatar: userData.avatar,
          email: userData.email || user.email,
          lastLoginAt: new Date(),
        },
      });
    } else {
      // Create new user from Discord OAuth
      user = await this.prisma.botUser.create({
        data: {
          discordId,
          username: userData.username,
          avatar: userData.avatar,
          email: userData.email,
          status: 'active',
          lastLoginAt: new Date(),
          oauthAccounts: {
            create: {
              provider: 'discord',
              providerAccountId: discordId,
              accessToken,
              refreshToken,
              expiresAt,
            },
          },
        },
      });
    }

    const session = await this.sessionService.createSession(user.id, ip, userAgent);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        discordId: user.discordId,
      },
      sessionToken: session.token,
    };
  }

  async getUserById(id: string) {
    return this.prisma.botUser.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        discordId: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async getUserGuildsWithDetails(guildIds: string[]) {
    if (guildIds.length === 0) {
      return [];
    }

    const guilds = await this.prisma.guild.findMany({
      where: {
        id: { in: guildIds },
      },
      select: {
        id: true,
        discordGuildId: true,
        name: true,
        icon: true,
        members: {
          select: {
            id: true,
          },
        },
      },
    });

    return guilds.map((guild) => ({
      id: guild.id,
      discordGuildId: guild.discordGuildId,
      name: guild.name,
      icon: guild.icon,
      memberCount: guild.members.length,
      connected: true,
    }));
  }
}

