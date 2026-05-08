import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryAnalyticsDto {
  @ApiProperty({ description: 'Number of days to analyze', required: false, minimum: 1, maximum: 365, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number;

  @ApiProperty({ description: 'Start date (ISO string)', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date (ISO string)', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class MemberGrowthResponseDto {
  @ApiProperty({ description: 'Total members', example: 1000 })
  total: number;

  @ApiProperty({ description: 'New members in period', example: 50 })
  newMembers: number;

  @ApiProperty({ description: 'Left members in period', example: 10 })
  leftMembers: number;

  @ApiProperty({ description: 'Net growth', example: 40 })
  netGrowth: number;

  @ApiProperty({ description: 'Growth percentage', example: 4.0 })
  growthPercentage: number;

  @ApiProperty({ description: 'Daily growth data', type: [Object] })
  dailyData: Array<{ date: string; joined: number; left: number; total: number }>;
}

export class ActivityMetricsResponseDto {
  @ApiProperty({ description: 'Total messages', example: 5000 })
  totalMessages: number;

  @ApiProperty({ description: 'Active users', example: 200 })
  activeUsers: number;

  @ApiProperty({ description: 'Average messages per user', example: 25 })
  avgMessagesPerUser: number;

  @ApiProperty({ description: 'Most active channel', example: 'general' })
  mostActiveChannel: string;

  @ApiProperty({ description: 'Daily activity data', type: [Object] })
  dailyData: Array<{ date: string; messages: number; users: number }>;
}

