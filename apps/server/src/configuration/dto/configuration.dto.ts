import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class SetConfigDto {
  @ApiProperty({ description: 'Configuration key', example: 'welcome_channel' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Configuration value', example: '123456789012345678' })
  @IsString()
  value: string;

  @ApiProperty({ description: 'Configuration description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Configuration category', required: false })
  @IsOptional()
  @IsString()
  category?: string;
}

export class SetStaticMessageDto {
  @ApiProperty({ description: 'Message key', example: 'welcome' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Message content', example: 'Welcome to the server!' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Channel ID to send to', required: false })
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiProperty({ description: 'Message enabled', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: 'Update existing messages', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  updateExisting?: boolean;
}

export class ToggleMessageDto {
  @ApiProperty({ description: 'Enable/disable message', example: true })
  @IsBoolean()
  enabled: boolean;
}

export class QueryConfigsDto {
  @ApiProperty({ description: 'Filter by category', required: false })
  @IsOptional()
  @IsString()
  category?: string;
}

