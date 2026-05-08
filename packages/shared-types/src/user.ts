export interface User {
  id: string;
  discordId: string;
  username: string;
  discriminator: string;
  avatar?: string;
  trustScore: number;
  reputation: number;
  joinedAt: Date;
  lastActive?: Date;
  flags: UserFlags[];
  roles: string[];
  permissions: string[];
}

export interface UserFlags {
  type: UserFlagType;
  reason?: string;
  issuedBy: string;
  issuedAt: Date;
  expiresAt?: Date;
}

export enum UserFlagType {
  TRUSTED = 'trusted',
  SUSPICIOUS = 'suspicious',
  BANNED = 'banned',
  MUTED = 'muted',
  WARNED = 'warned',
  PROBATION = 'probation'
}

export interface UserActivity {
  userId: string;
  guildId: string;
  messageCount: number;
  voiceTime: number;
  lastMessageAt?: Date;
  lastVoiceAt?: Date;
  channels: string[];
}

export interface UserTrustMetrics {
  userId: string;
  guildId: string;
  accountAge: number;
  serverTenure: number;
  messageQuality: number;
  ruleCompliance: number;
  socialConnections: number;
  overallScore: number;
  lastCalculated: Date;
}