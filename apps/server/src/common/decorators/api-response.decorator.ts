import { applyDecorators } from '@nestjs/common';
import { ApiResponse, ApiOperation } from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto';

/**
 * Common API response decorators for Swagger documentation
 */

/**
 * Standard success response decorator
 */
export const ApiSuccessResponse = (statusCode: number = 200, description: string = 'Success') => {
  return applyDecorators(
    ApiResponse({
      status: statusCode,
      description,
    }),
  );
};

/**
 * Standard error responses decorator
 * Includes common error codes: 400, 401, 403, 404, 500
 */
export const ApiStandardResponses = () => {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid input or missing required parameters',
      type: ErrorResponseDto,
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Authentication required',
      type: ErrorResponseDto,
    }),
    ApiResponse({
      status: 403,
      description: 'Forbidden - Insufficient permissions',
      type: ErrorResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Not Found - Resource not found',
      type: ErrorResponseDto,
    }),
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
      type: ErrorResponseDto,
    }),
  );
};

/**
 * Guild-related error responses
 * Includes guild-specific error codes
 */
export const ApiGuildResponses = () => {
  return applyDecorators(
    ApiStandardResponses(),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Guild ID is required (x-guild-id header or guildId query parameter)',
      type: ErrorResponseDto,
      schema: {
        example: {
          statusCode: 400,
          message: 'Guild ID is required. Please provide x-guild-id header or guildId query parameter.',
          error: 'Bad Request',
          timestamp: '2025-12-23T15:30:00.000Z',
          path: '/api/users',
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'Not Found - Guild not found or not connected',
      type: ErrorResponseDto,
      schema: {
        example: {
          statusCode: 404,
          message: 'Guild abc123 not found. Please connect the guild first via POST /api/guilds/:discordGuildId/connect',
          error: 'Not Found',
          timestamp: '2025-12-23T15:30:00.000Z',
          path: '/api/users',
        },
      },
    }),
  );
};

/**
 * Operation decorator with common metadata
 */
export const ApiOperationWithTags = (summary: string, tags: string[] = []) => {
  return applyDecorators(
    ApiOperation({
      summary,
      tags,
    }),
  );
};

