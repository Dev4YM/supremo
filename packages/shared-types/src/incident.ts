export interface Incident {
  id: string;
  guildId: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  userId?: string;
  channelId?: string;
  messageId?: string;
  reportedBy: string;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  evidence: Evidence[];
  actions: IncidentAction[];
  tags: string[];
  metadata: Record<string, any>;
}

export enum IncidentType {
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  TOXICITY = 'toxicity',
  NSFW = 'nsfw',
  SCAM = 'scam',
  RAID = 'raid',
  RULE_VIOLATION = 'rule_violation',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  OTHER = 'other'
}

export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum IncidentStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  PENDING_REVIEW = 'pending_review',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  ESCALATED = 'escalated'
}

export interface Evidence {
  id: string;
  type: EvidenceType;
  content: string;
  attachments: string[];
  collectedBy: string;
  collectedAt: Date;
  metadata: Record<string, any>;
}

export enum EvidenceType {
  MESSAGE = 'message',
  SCREENSHOT = 'screenshot',
  LOG = 'log',
  USER_REPORT = 'user_report',
  SYSTEM_DETECTION = 'system_detection',
  MODERATOR_NOTE = 'moderator_note'
}

export interface IncidentAction {
  id: string;
  type: IncidentActionType;
  performedBy: string;
  performedAt: Date;
  reason: string;
  duration?: number;
  metadata: Record<string, any>;
}

export enum IncidentActionType {
  WARN = 'warn',
  MUTE = 'mute',
  KICK = 'kick',
  BAN = 'ban',
  DELETE_MESSAGE = 'delete_message',
  TIMEOUT = 'timeout',
  ROLE_ADD = 'role_add',
  ROLE_REMOVE = 'role_remove',
  NOTE = 'note'
}