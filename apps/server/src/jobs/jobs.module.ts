import { Module } from '@nestjs/common';
import { JobSchedulerService } from './job-scheduler.service';
import { JobController } from './job.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AutomationModule } from '../automation/automation.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AutomationModule, AuthModule, AuditModule],
  controllers: [JobController],
  providers: [JobSchedulerService],
  exports: [JobSchedulerService],
})
export class JobsModule {}

