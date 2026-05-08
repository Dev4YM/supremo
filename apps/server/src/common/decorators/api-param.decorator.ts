import { applyDecorators } from '@nestjs/common';
import { ApiParam, ApiQuery, ApiHeader } from '@nestjs/swagger';

/**
 * Common API parameter decorators for Swagger documentation
 */

/**
 * Guild ID parameter decorator
 * Documents the guild ID requirement for server-related endpoints
 */
export const ApiGuildParam = () => {
  return applyDecorators(
    ApiHeader({
      name: 'x-guild-id',
      description: 'Guild ID for server-related endpoints',
      required: true,
      example: 'guild-uuid-here',
    }),
    ApiQuery({
      name: 'guildId',
      description: 'Alternative way to provide guild ID (query parameter)',
      required: false,
      example: 'guild-uuid-here',
    }),
  );
};

/**
 * Pagination query parameters
 */
export const ApiPaginationParams = () => {
  return applyDecorators(
    ApiQuery({
      name: 'page',
      description: 'Page number (1-indexed)',
      required: false,
      type: Number,
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      description: 'Items per page',
      required: false,
      type: Number,
      example: 10,
    }),
  );
};

/**
 * Common query parameters for filtering
 */
export const ApiFilterParams = () => {
  return applyDecorators(
    ApiQuery({
      name: 'status',
      description: 'Filter by status',
      required: false,
      type: String,
    }),
    ApiQuery({
      name: 'search',
      description: 'Search query',
      required: false,
      type: String,
    }),
  );
};

