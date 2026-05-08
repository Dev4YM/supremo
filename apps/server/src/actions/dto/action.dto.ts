import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';

export class CreateActionDto {
  @ApiProperty({ description: 'User ID to perform action on', example: 'user-uuid' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Related incident ID', required: false })
  @IsOptional()
  @IsString()
  incidentId?: string;

  @ApiProperty({ description: 'Action type', enum: ['warn', 'timeout', 'note', 'ban', 'kick'], example: 'warn' })
  @IsEnum(['warn', 'timeout', 'note', 'ban', 'kick'])
  actionType: 'warn' | 'timeout' | 'note' | 'ban' | 'kick';

  @ApiProperty({ description: 'Duration in seconds (for timeouts)', required: false, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;

  @ApiProperty({ description: 'Reason for action', required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ description: 'Discord ID of executor', example: '123456789012345678' })
  @IsString()
  executor: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  metadata?: any;
}

