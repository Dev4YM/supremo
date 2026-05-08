import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  constructor(private readonly prisma: PrismaService) {}

  async createSession(botUserId: string, ip?: string, userAgent?: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);

    const expiresAt = new Date(Date.now() + this.SESSION_DURATION_MS);

    const session = await this.prisma.authSession.create({
      data: {
        botUserId,
        tokenHash,
        expiresAt,
        ip,
        userAgent,
        lastSeenAt: new Date(),
      },
    });

    return {
      id: session.id,
      token,
      expiresAt: session.expiresAt,
    };
  }

  async validateSession(token: string): Promise<{ botUserId: string; sessionId: string } | null> {
    const tokenHash = this.hashToken(token);

    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash },
      include: {
        botUser: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    // Check if session is expired or revoked
    if (session.expiresAt < new Date() || session.revokedAt) {
      return null;
    }

    // Check if user is active
    if (session.botUser.status !== 'active') {
      return null;
    }

    // Update last seen
    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });

    return {
      botUserId: session.botUserId,
      sessionId: session.id,
    };
  }

  /**
   * Revoke session
   */
  async revokeSession(token: string) {
    const tokenHash = this.hashToken(token);
    await this.prisma.authSession.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllUserSessions(botUserId: string) {
    await this.prisma.authSession.updateMany({
      where: {
        botUserId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    const result = await this.prisma.authSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { not: null } },
        ],
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired sessions`);
    return result.count;
  }

  /**
   * Hash token for storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

