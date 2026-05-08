import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsEnum, IsNumber, IsArray, Min, Max } from 'class-validator';

export enum RuleType {
  SPAM = 'spam',
  PROFANITY = 'profanity',
  LINKS = 'links',
  CAPS = 'caps',
  MENTIONS = 'mentions',
  CUSTOM = 'custom',
}

export enum RuleAction {
  DELETE = 'delete',
  WARN = 'warn',
  TIMEOUT = 'timeout',
  KICK = 'kick',
  BAN = 'ban',
}

export class CreateAutoModRuleDto {
  @ApiProperty({ description: 'Rule name', example: 'Anti-Spam Rule' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Rule type', enum: RuleType, example: RuleType.SPAM })
  @IsEnum(RuleType)
  type: RuleType;

  @ApiProperty({ description: 'Action to take', enum: RuleAction, example: RuleAction.DELETE })
  @IsEnum(RuleAction)
  action: RuleAction;

  @ApiProperty({ description: 'Rule enabled', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: 'Rule pattern/regex', required: false })
  @IsOptional()
  @IsString()
  pattern?: string;

  @ApiProperty({ description: 'Threshold for violations', required: false, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  threshold?: number;

  @ApiProperty({ description: 'Time window in seconds', required: false, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  timeWindowSeconds?: number;

  @ApiProperty({ description: 'Exempt role IDs', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exemptRoleIds?: string[];

  @ApiProperty({ description: 'Exempt channel IDs', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exemptChannelIds?: string[];

  @ApiProperty({ description: 'Custom metadata', required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateAutoModRuleDto {
  @ApiProperty({ description: 'Rule name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Rule enabled', required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: 'Rule pattern/regex', required: false })
  @IsOptional()
  @IsString()
  pattern?: string;

  @ApiProperty({ description: 'Threshold for violations', required: false, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  threshold?: number;

  @ApiProperty({ description: 'Time window in seconds', required: false, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  timeWindowSeconds?: number;

  @ApiProperty({ description: 'Action to take', enum: RuleAction, required: false })
  @IsOptional()
  @IsEnum(RuleAction)
  action?: RuleAction;

  @ApiProperty({ description: 'Exempt role IDs', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exemptRoleIds?: string[];

  @ApiProperty({ description: 'Exempt channel IDs', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exemptChannelIds?: string[];
}

