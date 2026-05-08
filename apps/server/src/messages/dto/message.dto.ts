import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';

export class QuerySentMessagesDto {
  @ApiProperty({ description: 'Filter by channel ID', required: false })
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiProperty({ description: 'Filter by static message key', required: false })
  @IsOptional()
  @IsString()
  staticMessageKey?: string;

  @ApiProperty({ description: 'Maximum number of messages', required: false, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiProperty({ description: 'Number of messages to skip', required: false, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

export class SendStaticMessageDto {
  @ApiProperty({ description: 'Channel ID to send to', required: false })
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiProperty({ description: 'Replace existing message', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  replaceExisting?: boolean;
}

export class UpdateStaticMessageDto {
  @ApiProperty({ description: 'Message content', example: 'Updated welcome message!' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Channel ID', required: false })
  @IsOptional()
  @IsString()
  channelId?: string;
}

