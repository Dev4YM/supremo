import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ description: 'User ID', example: 'user-uuid' })
  id: string;

  @ApiProperty({ description: 'Discord user ID', example: '123456789012345678' })
  discordId: string;

  @ApiProperty({ description: 'Username', example: 'JohnDoe' })
  username: string;

  @ApiProperty({ description: 'Discriminator', example: '1234', required: false })
  discriminator?: string;

  @ApiProperty({ description: 'Avatar URL', example: 'https://cdn.discordapp.com/avatars/...', required: false })
  avatar?: string;

  @ApiProperty({ description: 'Trust score', example: 100 })
  trustScore: number;

  @ApiProperty({ description: 'Warning count', example: 0 })
  warningCount: number;

  @ApiProperty({ description: 'Message count', example: 150 })
  messageCount: number;

  @ApiProperty({ description: 'Join date', example: '2025-01-01T00:00:00.000Z' })
  joinedAt: Date;

  @ApiProperty({ description: 'Last activity date', example: '2025-12-23T15:30:00.000Z' })
  lastActivity: Date;

  @ApiProperty({ description: 'User notes', required: false })
  notes?: string;
}

export class UserProfileResponseDto extends UserResponseDto {
  @ApiProperty({ description: 'User roles', type: [String], example: ['Member', 'Verified'] })
  roles: string[];

  @ApiProperty({ description: 'User permissions', type: [String], example: ['SEND_MESSAGES'] })
  permissions: string[];

  @ApiProperty({ description: 'Recent incidents', type: [Object], required: false })
  recentIncidents?: any[];

  @ApiProperty({ description: 'Recent actions', type: [Object], required: false })
  recentActions?: any[];
}

