// Shared types between API server and Bot worker

export interface DiscordEvent {
  type: 'message' | 'member_join' | 'member_leave' | 'role_update' | 'audit_log';
  guildId: string;
  userId?: string;
  data: any;
}

export interface DetectionResult {
  detected: boolean;
  type?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  confidence?: number;
  evidence?: any;
  recommendedActions?: any[];
  safe?: boolean;
}

export interface ActionPayload {
  type: 'timeout' | 'kick' | 'ban' | 'delete_messages' | 'assign_role' | 'remove_role' | 'warn' | 'log_only';
  guildId: string;
  userId: string;
  parameters: any;
}

export interface IncidentPayload {
  guildId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  evidence: any;
  recommendedActions: any[];
  userId?: string;
}


