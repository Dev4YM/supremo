import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { SessionService } from '../session.service';

interface AuthenticatedRequest extends Request {
  botUserId?: string;
  guildId?: string;
  permissions?: Set<string>;
}

/**
 * SessionGuard - Validates session and attaches user ID to request
 * 
 * Only handles authentication. Does NOT check guild access or permissions.
 * Use GuildGuard after this guard for guild-scoped endpoints.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No session token provided');
    }

    const session = await this.sessionService.validateSession(token);
    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Attach user ID to request
    request.botUserId = session.botUserId;

    return true;
  }

  private extractToken(request: Request): string | null {
    // Try cookie first (preferred for same-origin)
    if (request.cookies?.session_token) {
      return request.cookies.session_token;
    }

    // Fallback to Authorization header for API clients
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}

