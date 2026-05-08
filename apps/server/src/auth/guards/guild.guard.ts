import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { RbacService } from '../rbac.service';

interface AuthenticatedRequest extends Request {
  botUserId?: string;
  guildId?: string;
  permissions?: Set<string>;
}

/**
 * GuildGuard - Verifies user has access to the requested guild
 * 
 * Must be used AFTER SessionGuard to ensure botUserId is set.
 * Extracts guild ID from X-Guild-Id header or guildId query param,
 * verifies access, and attaches guildId and permissions to request.
 */
@Injectable()
export class GuildGuard implements CanActivate {
  constructor(private rbacService: RbacService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    
    // SessionGuard should have already set botUserId
    if (!request.botUserId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Extract guild ID from header or query
    const guildId = request.headers['x-guild-id'] as string || request.query.guildId as string;
    
    if (!guildId) {
      throw new ForbiddenException('Guild ID is required');
    }

    // Verify user has access to this guild
    const hasAccess = await this.rbacService.hasGuildAccess(request.botUserId, guildId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this guild');
    }

    // Attach guild ID to request
    request.guildId = guildId;

    // Resolve permissions for this guild
    const { permissions } = await this.rbacService.resolvePermissions(request.botUserId, guildId);
    request.permissions = permissions;

    return true;
  }
}
