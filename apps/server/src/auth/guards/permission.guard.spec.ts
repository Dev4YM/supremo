import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PermissionGuard } from './permission.guard';

function createHttpContext(req: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as ExecutionContext;
}

describe('PermissionGuard', () => {
  it('allows when guild permissions already include the required key', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue('ACTIONS_VIEW') } as unknown as Reflector;
    const rbac = { resolvePermissions: jest.fn() };
    const guard = new PermissionGuard(reflector, rbac as any);

    await expect(
      guard.canActivate(
        createHttpContext({
          botUserId: 'user-1',
          permissions: new Set(['ACTIONS_VIEW']),
        }),
      ),
    ).resolves.toBe(true);
    expect(rbac.resolvePermissions).not.toHaveBeenCalled();
  });

  it('resolves global RBAC when request.permissions is undefined', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue('SYSTEM_ADMIN') } as unknown as Reflector;
    const rbac = {
      resolvePermissions: jest.fn().mockResolvedValue({ permissions: new Set(['SYSTEM_ADMIN']) }),
    };
    const guard = new PermissionGuard(reflector, rbac as any);

    await expect(
      guard.canActivate(
        createHttpContext({
          botUserId: 'admin-1',
        }),
      ),
    ).resolves.toBe(true);
    expect(rbac.resolvePermissions).toHaveBeenCalledWith('admin-1');
  });

  it('denies when global RBAC lacks the permission', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue('SYSTEM_ADMIN') } as unknown as Reflector;
    const rbac = {
      resolvePermissions: jest.fn().mockResolvedValue({ permissions: new Set(['GUILD_SETTINGS_VIEW']) }),
    };
    const guard = new PermissionGuard(reflector, rbac as any);

    await expect(guard.canActivate(createHttpContext({ botUserId: 'u1' }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows routes with no permission metadata', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const rbac = { resolvePermissions: jest.fn() };
    const guard = new PermissionGuard(reflector, rbac as any);

    await expect(guard.canActivate(createHttpContext({}))).resolves.toBe(true);
  });
});
