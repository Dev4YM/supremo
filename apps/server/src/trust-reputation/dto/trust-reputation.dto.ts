import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max, IsEnum } from 'class-validator';

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export class UpdateTrustReputationConfigDto {
  @ApiProperty({ description: 'Enable trust system', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: 'Initial trust score', required: false, minimum: 0, maximum: 1000, default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  initialTrustScore?: number;

  @ApiProperty({ description: 'Trust score decay per day', required: false, minimum: 0, maximum: 10, default: 0.1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  dailyDecay?: number;

  @ApiProperty({ description: 'Minimum trust score for actions', required: false, minimum: 0, maximum: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  minTrustScore?: number;
}

export class AssessRiskDto {
  @ApiProperty({ description: 'User ID to assess', example: 'user-uuid' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Additional context', required: false })
  @IsOptional()
  @IsString()
  context?: string;
}

export class UpdateTrustScoreDto {
  @ApiProperty({ description: 'User ID', example: 'user-uuid' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Trust score change', example: 10, minimum: -1000, maximum: 1000 })
  @IsNumber()
  @Min(-1000)
  @Max(1000)
  change: number;

  @ApiProperty({ description: 'Reason for change', example: 'Helped another user' })
  @IsString()
  reason: string;
}

