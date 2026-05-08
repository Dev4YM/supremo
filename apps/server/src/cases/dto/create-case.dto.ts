import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateCaseDto {
  @ApiProperty({ required: false, description: 'Internal User id (guild member row)' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ required: false, description: 'Discord snowflake of the subject' })
  @IsOptional()
  @IsString()
  subjectDiscordId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subjectUsername?: string;

  @ApiProperty({ example: 'moderation' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'medium' })
  @IsString()
  severity: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assignedTo?: string;
}
