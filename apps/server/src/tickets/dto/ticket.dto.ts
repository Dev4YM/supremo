import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsNumber, Min, Max } from 'class-validator';

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export class CreateTicketDto {
  @ApiProperty({ description: 'Ticket category ID', example: 'category-uuid' })
  @IsString()
  categoryId: string;

  @ApiProperty({ description: 'Ticket title', example: 'Need help with permissions' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Ticket description', example: 'I cannot access certain channels' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'User ID who created the ticket', example: 'user-uuid', required: false })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class UpdateTicketStatusDto {
  @ApiProperty({ description: 'New ticket status', enum: TicketStatus, example: TicketStatus.RESOLVED })
  @IsEnum(TicketStatus)
  status: TicketStatus;
}

export class AssignTicketDto {
  @ApiProperty({ description: 'User ID to assign ticket to', example: 'user-uuid' })
  @IsString()
  assignedTo: string;
}

export class AddTicketMessageDto {
  @ApiProperty({ description: 'Message content', example: 'Here is the solution...' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Whether message is internal (staff only)', required: false, default: false })
  @IsOptional()
  isInternal?: boolean;
}

export class CreateTicketCategoryDto {
  @ApiProperty({ description: 'Category name', example: 'Technical Support' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Category description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Category emoji', required: false, example: '🔧' })
  @IsOptional()
  @IsString()
  emoji?: string;

  @ApiProperty({ description: 'Discord channel ID for tickets', required: false })
  @IsOptional()
  @IsString()
  channelId?: string;
}

export class CreateSLADto {
  @ApiProperty({ description: 'SLA name', example: 'Standard Support' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Response time in hours', example: 24, minimum: 1 })
  @IsNumber()
  @Min(1)
  responseTimeHours: number;

  @ApiProperty({ description: 'Resolution time in hours', example: 72, minimum: 1 })
  @IsNumber()
  @Min(1)
  resolutionTimeHours: number;

  @ApiProperty({ description: 'Category IDs this SLA applies to', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];
}

export class QueryTicketsDto {
  @ApiProperty({ description: 'Filter by status', enum: TicketStatus, required: false })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiProperty({ description: 'Filter by category ID', required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ description: 'Filter by assigned user ID', required: false })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiProperty({ description: 'Filter by user ID', required: false })
  @IsOptional()
  @IsString()
  userId?: string;
}

