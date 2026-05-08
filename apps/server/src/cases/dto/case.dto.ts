import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsObject } from 'class-validator';

export enum CaseStatus {
  PENDING = 'pending',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum CaseType {
  MODERATION = 'moderation',
  APPEAL = 'appeal',
  REPORT = 'report',
  OTHER = 'other',
}

export class CreateCaseDto {
  @ApiProperty({ description: 'User ID', example: 'user-uuid' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Case type', enum: CaseType, example: CaseType.MODERATION })
  @IsEnum(CaseType)
  type: CaseType;

  @ApiProperty({ description: 'Case title', example: 'User violation report' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Case description', example: 'User violated rule #3' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Related incident ID', required: false })
  @IsOptional()
  @IsString()
  incidentId?: string;

  @ApiProperty({ description: 'Initial evidence', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence?: string[];
}

export class UpdateCaseDto {
  @ApiProperty({ description: 'Case status', enum: CaseStatus, required: false })
  @IsOptional()
  @IsEnum(CaseStatus)
  status?: CaseStatus;

  @ApiProperty({ description: 'Case title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Case description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Assigned user ID', required: false })
  @IsOptional()
  @IsString()
  assignedTo?: string;
}

export class AssignCaseDto {
  @ApiProperty({ description: 'User ID to assign case to', example: 'user-uuid' })
  @IsString()
  assignedTo: string;
}

export class ResolveCaseDto {
  @ApiProperty({ description: 'Resolution notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddCaseEvidenceDto {
  @ApiProperty({ description: 'Evidence type', example: 'message_link' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Evidence content/URL', example: 'https://discord.com/channels/...' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class AddCaseNoteDto {
  @ApiProperty({ description: 'Note content', example: 'Investigated and found...' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Whether note is internal', required: false, default: false })
  @IsOptional()
  isInternal?: boolean;
}

export class CreateAppealDto {
  @ApiProperty({ description: 'Appeal reason', example: 'I believe this was a mistake' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Additional context', required: false })
  @IsOptional()
  @IsString()
  context?: string;
}

export class ReviewAppealDto {
  @ApiProperty({ description: 'Appeal decision', enum: ['approved', 'rejected'], example: 'approved' })
  @IsEnum(['approved', 'rejected'])
  decision: 'approved' | 'rejected';

  @ApiProperty({ description: 'Review notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

