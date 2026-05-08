import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsEnum, Min, Max } from 'class-validator';

export enum QuestionType {
  TEXT = 'text',
  MULTIPLE_CHOICE = 'multiple_choice',
  SINGLE_CHOICE = 'single_choice',
  BOOLEAN = 'boolean',
}

export class UpdateOnboardingFlowDto {
  @ApiProperty({ description: 'Flow enabled', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: 'Welcome message', required: false })
  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  @ApiProperty({ description: 'Require verification', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  requireVerification?: boolean;
}

export class CreateWelcomeMessageDto {
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
}

export class CreateQuestionDto {
  @ApiProperty({ description: 'Question text', example: 'What is your favorite color?' })
  @IsString()
  question: string;

  @ApiProperty({ description: 'Question type', enum: QuestionType, example: QuestionType.MULTIPLE_CHOICE })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({ description: 'Question required', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiProperty({ description: 'Question order', required: false, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;

  @ApiProperty({ description: 'Answer options (for choice types)', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];
}

export class CreateDMSequenceDto {
  @ApiProperty({ description: 'Sequence name', example: 'Welcome Sequence' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Messages in sequence', type: [Object] })
  @IsArray()
  messages: Array<{
    content: string;
    delayMinutes: number;
    order: number;
  }>;
}

export class CreateReactionRoleDto {
  @ApiProperty({ description: 'Message ID', example: 'message-id' })
  @IsString()
  messageId: string;

  @ApiProperty({ description: 'Channel ID', example: 'channel-id' })
  @IsString()
  channelId: string;

  @ApiProperty({ description: 'Emoji', example: '✅' })
  @IsString()
  emoji: string;

  @ApiProperty({ description: 'Role ID to assign', example: 'role-id' })
  @IsString()
  roleId: string;
}

export class CreateTemporaryRoleDto {
  @ApiProperty({ description: 'User ID', example: 'user-uuid' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Role ID', example: 'role-id' })
  @IsString()
  roleId: string;

  @ApiProperty({ description: 'Duration in days', example: 7, minimum: 1, maximum: 365 })
  @IsNumber()
  @Min(1)
  @Max(365)
  durationDays: number;
}

