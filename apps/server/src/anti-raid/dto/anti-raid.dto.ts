import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Min, Max, IsEnum } from 'class-validator';

export class UpdateAntiRaidConfigDto {
  @ApiProperty({ description: 'Enable anti-raid protection', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: 'Maximum joins per time window', required: false, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxJoinsPerWindow?: number;

  @ApiProperty({ description: 'Time window in seconds', required: false, minimum: 1, maximum: 3600 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3600)
  timeWindowSeconds?: number;

  @ApiProperty({ description: 'Action to take when limit exceeded', enum: ['kick', 'ban', 'timeout'], required: false })
  @IsOptional()
  @IsEnum(['kick', 'ban', 'timeout'])
  action?: 'kick' | 'ban' | 'timeout';

  @ApiProperty({ description: 'Timeout duration in seconds (if action is timeout)', required: false, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  timeoutDuration?: number;

  @ApiProperty({ description: 'Enable account age check', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  checkAccountAge?: boolean;

  @ApiProperty({ description: 'Minimum account age in days', required: false, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minAccountAgeDays?: number;

  @ApiProperty({ description: 'Enable verification requirement', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  requireVerification?: boolean;
}

