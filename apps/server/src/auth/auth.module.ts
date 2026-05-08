import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { RbacService } from './rbac.service';
import { SessionGuard } from './guards/session.guard';
import { GuildGuard } from './guards/guild.guard';
import { PermissionGuard } from './guards/permission.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, SessionService, RbacService, SessionGuard, GuildGuard, PermissionGuard],
  exports: [AuthService, SessionService, RbacService, SessionGuard, GuildGuard, PermissionGuard],
})
export class AuthModule {}

