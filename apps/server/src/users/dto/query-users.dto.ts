import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryUsersDto {
  @ApiProperty({
    description: 'Sync users from Discord',
    required: false,
    type: Boolean,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  sync?: boolean;

  @ApiProperty({
    description: 'Maximum number of users to return',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 100,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiProperty({
    description: 'Number of users to skip',
    required: false,
    type: Number,
    minimum: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

