import { Injectable, CanActivate, ExecutionContext, SetMetadata, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RbacService } from '../rbac.service';

export const PERMISSION_KEY = 'permission';

export const RequirePermission = (permission: string) => SetMetadata(PERMISSION_KEY, permission);

interface AuthenticatedRequest extends Request {
  botUserId?: string;
  guildId?: string;
  permissions?: Set<string>;
}

/**
 * Resolves permissions from `request.permissions` when GuildGuard ran first.
 * If still unset (e.g. debug-only routes without a guild), falls back to global RBAC only.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermission) {
      return true; // No permission required
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    let permissions = request.permissions;

    if (permissions === undefined && request.botUserId) {
      const { permissions: global } = await this.rbacService.resolvePermissions(request.botUserId);
      permissions = global;
    }

    if (!permissions || !permissions.has(requiredPermission)) {
      throw new ForbiddenException(`Permission required: ${requiredPermission}`);
    }

    return true;
  }
}

