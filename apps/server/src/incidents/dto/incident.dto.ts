import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsOptional, IsEnum, Min, Max, IsIn } from 'class-validator';

export class CreateIncidentDto {
  @ApiProperty({ description: 'User ID', example: 'user-uuid' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Rule that triggered the incident', example: 'spam_detection' })
  @IsString()
  ruleTriggered: string;

  @ApiProperty({ description: 'Evidence URLs/links', type: [String], example: ['https://discord.com/channels/...'] })
  @IsArray()
  @IsString({ each: true })
  evidence: string[];

  @ApiProperty({ description: 'Confidence score (0-100)', example: 85, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  confidenceScore: number;

  @ApiProperty({ description: 'Recommended action', enum: ['warn', 'timeout', 'note', 'none'], example: 'warn' })
  @IsEnum(['warn', 'timeout', 'note', 'none'])
  recommendedAction: 'warn' | 'timeout' | 'note' | 'none';

  @ApiProperty({ description: 'Reasoning for the incident', required: false })
  @IsOptional()
  @IsString()
  reasoning?: string;
}

export class UpdateIncidentDto {
  @ApiProperty({
    description: 'Incident status (lowercase; mapped to Prisma enum on update)',
    enum: ['pending', 'reviewing', 'approved', 'rejected', 'resolved'],
    required: false,
  })
  @IsOptional()
  @IsIn(['pending', 'reviewing', 'approved', 'rejected', 'resolved'])
  status?: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'resolved';

  @ApiProperty({ description: 'User ID who resolved the incident', required: false })
  @IsOptional()
  @IsString()
  resolvedBy?: string;

  @ApiProperty({ description: 'Resolution timestamp', required: false })
  @IsOptional()
  resolvedAt?: Date;

  @ApiProperty({ description: 'Moderator notes', required: false })
  @IsOptional()
  @IsString()
  moderatorNotes?: string;
}

export class ApproveIncidentDto {
  @ApiProperty({ description: 'Moderator user ID', example: 'user-uuid' })
  @IsString()
  moderatorId: string;

  @ApiProperty({ description: 'Approval notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectIncidentDto {
  @ApiProperty({ description: 'Moderator user ID', example: 'user-uuid' })
  @IsString()
  moderatorId: string;

  @ApiProperty({ description: 'Rejection notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

