import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsEnum, IsObject, IsArray } from 'class-validator';

export enum AutomationTriggerType {
  MESSAGE = 'message',
  MEMBER_JOIN = 'member_join',
  MEMBER_LEAVE = 'member_leave',
  REACTION = 'reaction',
  VOICE_STATE = 'voice_state',
  SCHEDULED = 'scheduled',
  COMMAND = 'command',
}

export enum AutomationStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  DRAFT = 'draft',
}

export class CreateAutomationDto {
  @ApiProperty({ description: 'Automation name', example: 'Welcome New Members' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Automation description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Trigger type', enum: AutomationTriggerType, example: AutomationTriggerType.MEMBER_JOIN })
  @IsEnum(AutomationTriggerType)
  triggerType: AutomationTriggerType;

  @ApiProperty({ description: 'Trigger configuration', type: Object, required: false })
  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, any>;

  @ApiProperty({ description: 'Workflow steps', type: [Object] })
  @IsArray()
  steps: Array<{
    type: string;
    config: Record<string, any>;
    order: number;
  }>;

  @ApiProperty({ description: 'Automation enabled', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateAutomationDto {
  @ApiProperty({ description: 'Automation name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Automation description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Automation enabled', required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: 'Trigger configuration', type: Object, required: false })
  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, any>;

  @ApiProperty({ description: 'Workflow steps', type: [Object], required: false })
  @IsOptional()
  @IsArray()
  steps?: Array<{
    type: string;
    config: Record<string, any>;
    order: number;
  }>;
}

export class ExecuteAutomationDto {
  @ApiProperty({ description: 'Automation ID', example: 'automation-uuid' })
  @IsString()
  automationId: string;

  @ApiProperty({ description: 'Execution context', type: Object, required: false })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

