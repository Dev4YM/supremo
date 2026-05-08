import { ApiProperty } from '@nestjs/swagger';

/**
 * Standardized error response DTO
 * Used for consistent error responses across all endpoints
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Guild ID is required',
  })
  message: string;

  @ApiProperty({
    description: 'Error type/name',
    example: 'Bad Request',
  })
  error: string;

  @ApiProperty({
    description: 'Timestamp when error occurred',
    example: '2025-12-23T15:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path',
    example: '/api/users',
  })
  path: string;

  @ApiProperty({
    description: 'Additional error details',
    required: false,
    example: { field: 'guildId', reason: 'Missing required parameter' },
  })
  details?: any;
}

