import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray, IsObject } from 'class-validator';

export class CreateCommandDto {
  @ApiProperty({ description: 'Command name', example: 'ping' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Command description', example: 'Responds with pong' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Command category', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Command enabled', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: 'Command response', required: false })
  @IsOptional()
  @IsString()
  response?: string;

  @ApiProperty({ description: 'Command actions/workflow', type: [Object], required: false })
  @IsOptional()
  @IsArray()
  actions?: Array<{
    type: string;
    config: Record<string, any>;
  }>;

  @ApiProperty({ description: 'Required permissions', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredPermissions?: string[];
}

export class UpdateCommandDto {
  @ApiProperty({ description: 'Command description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Command enabled', required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: 'Command response', required: false })
  @IsOptional()
  @IsString()
  response?: string;

  @ApiProperty({ description: 'Command actions/workflow', type: [Object], required: false })
  @IsOptional()
  @IsArray()
  actions?: Array<{
    type: string;
    config: Record<string, any>;
  }>;
}

export class QueryCommandsDto {
  @ApiProperty({ description: 'Filter by category', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Filter by system commands', required: false })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @ApiProperty({ description: 'Filter by enabled status', required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

