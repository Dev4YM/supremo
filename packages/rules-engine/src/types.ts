export interface ModerationRule {
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  category: RuleCategory;
  evaluate(signal: Signal): Promise<RuleResult>;
}

export interface RuleResult {
  triggered: boolean;
  confidence: number;
  reason: string;
  suggestedAction?: ActionType;
  severity?: SeverityLevel;
  metadata?: Record<string, any>;
  processingTime?: number;
}

export interface Signal {
  type: SignalType;
  timestamp: Date;
  guildId: string;
  userId?: string;
  channelId?: string;
  messageId?: string;
  data: Record<string, any>;
}

export enum SignalType {
  MESSAGE_SENT = 'message_sent',
  MESSAGE_EDITED = 'message_edited',
  MESSAGE_DELETED = 'message_deleted',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  USER_BANNED = 'user_banned',
  USER_UNBANNED = 'user_unbanned',
  ROLE_ADDED = 'role_added',
  ROLE_REMOVED = 'role_removed',
  CHANNEL_CREATED = 'channel_created',
  CHANNEL_DELETED = 'channel_deleted',
  VOICE_JOIN = 'voice_join',
  VOICE_LEAVE = 'voice_leave',
  REACTION_ADDED = 'reaction_added',
  REACTION_REMOVED = 'reaction_removed',
  CUSTOM = 'custom'
}

export enum RuleCategory {
  CONTENT_ANALYSIS = 'content_analysis',
  BEHAVIORAL = 'behavioral',
  SECURITY = 'security',
  SPAM_DETECTION = 'spam_detection',
  TRUST_SYSTEM = 'trust_system',
  CUSTOM = 'custom'
}

export enum ActionType {
  NONE = 'none',
  FLAG = 'flag',
  WARN = 'warn',
  DELETE_MESSAGE = 'delete_message',
  MUTE_USER = 'mute_user',
  KICK_USER = 'kick_user',
  BAN_USER = 'ban_user',
  TIMEOUT_USER = 'timeout_user',
  ADD_ROLE = 'add_role',
  REMOVE_ROLE = 'remove_role',
  LOG_INCIDENT = 'log_incident',
  ESCALATE = 'escalate'
}

export enum SeverityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface RuleConfig {
  enabled: boolean;
  sensitivity: number;
  threshold: number;
  exemptRoles: string[];
  exemptChannels: string[];
  exemptUsers: string[];
  customSettings: Record<string, any>;
}

export interface EngineConfig {
  rules: Record<string, RuleConfig>;
  signals: {
    messageAnalysis: boolean;
    userBehavior: boolean;
    serverEvents: boolean;
    customEvents: boolean;
  };
  processing: {
    maxConcurrentRules: number;
    timeoutMs: number;
    retryAttempts: number;
  };
  logging: {
    enabled: boolean;
    level: LogLevel;
    includeMetadata: boolean;
  };
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface EvaluationContext {
  guildId: string;
  userId?: string;
  channelId?: string;
  userTrustScore?: number;
  userRoles?: string[];
  channelType?: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface RuleStatistics {
  ruleName: string;
  totalEvaluations: number;
  totalTriggered: number;
  averageConfidence: number;
  averageProcessingTime: number;
  lastTriggered?: Date;
  errorCount: number;
}

export interface EngineStatistics {
  totalSignalsProcessed: number;
  totalRulesEvaluated: number;
  totalViolationsDetected: number;
  averageProcessingTime: number;
  ruleStatistics: RuleStatistics[];
  uptime: number;
  lastReset: Date;
}