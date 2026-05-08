import { Module, forwardRef } from '@nestjs/common';
import { MessageBuilderService } from './message-builder.service';
import { AutomationModule } from '../automation/automation.module';

@Module({
  imports: [forwardRef(() => AutomationModule)],
  providers: [MessageBuilderService],
  exports: [MessageBuilderService],
})
export class MessagingModule {}

