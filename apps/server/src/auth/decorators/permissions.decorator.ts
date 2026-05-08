import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permissions';
export const RequirePermission = (...permissions: string[]) => SetMetadata(PERMISSION_KEY, permissions);

export const Permissions = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.permissions || new Set<string>();
  },
);

