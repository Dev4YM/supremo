import { ActionType } from './action';

export interface GuildConfig {
  id: string;
  guildId: string;
  name: string;
  prefix: string;
  language: string;
  timezone: string;
  features: GuildFeatures;
  moderation: ModerationConfig;
  automation: AutomationConfig;
  antiRaid: AntiRaidConfig;
  onboarding: OnboardingConfig;
  tickets: TicketConfig;
  analytics: AnalyticsConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface GuildFeatures {
  autoModeration: boolean;
  antiRaid: boolean;
  trustSystem: boolean;
  onboarding: boolean;
  tickets: boolean;
  analytics: boolean;
  workflows: boolean;
  customCommands: boolean;
}

export interface ModerationConfig {
  enabled: boolean;
  autoDeleteSpam: boolean;
  autoDeleteToxic: boolean;
  autoDeleteNSFW: boolean;
  confidenceThreshold: number;
  exemptRoles: string[];
  exemptChannels: string[];
  logChannel?: string;
  alertChannel?: string;
  requireApproval: boolean;
  escalationRules: EscalationRule[];
}

export interface EscalationRule {
  violations: number;
  timeWindow: number; // in minutes
  action: ActionType;
  duration?: number; // in minutes
}

export interface AutomationConfig {
  enabled: boolean;
  maxWorkflows: number;
  maxActionsPerWorkflow: number;
  allowExternalWebhooks: boolean;
  allowScheduledActions: boolean;
  logChannel?: string;
}

export interface AntiRaidConfig {
  enabled: boolean;
  joinRateLimit: number;
  joinRateWindow: number; // in minutes
  accountAgeThreshold: number; // in days
  autoLockdown: boolean;
  lockdownDuration: number; // in minutes
  verificationLevel: VerificationLevel;
  alertChannel?: string;
  exemptRoles: string[];
}

export enum VerificationLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export interface OnboardingConfig {
  enabled: boolean;
  welcomeChannel?: string;
  rulesChannel?: string;
  roleSelectionChannel?: string;
  verificationRequired: boolean;
  questionsRequired: boolean;
  defaultRole?: string;
  welcomeMessage?: string;
  dmWelcome: boolean;
  steps: OnboardingStep[];
}

export interface OnboardingStep {
  id: string;
  type: OnboardingStepType;
  title: string;
  description: string;
  required: boolean;
  order: number;
  config: Record<string, any>;
}

export enum OnboardingStepType {
  WELCOME = 'welcome',
  RULES_ACCEPTANCE = 'rules_acceptance',
  ROLE_SELECTION = 'role_selection',
  VERIFICATION = 'verification',
  QUESTIONS = 'questions',
  CHANNEL_TOUR = 'channel_tour'
}

export interface TicketConfig {
  enabled: boolean;
  categoryId?: string;
  supportRoles: string[];
  autoClose: boolean;
  autoCloseTime: number; // in hours
  transcriptChannel?: string;
  maxTicketsPerUser: number;
  categories: TicketCategory[];
}

export interface TicketCategory {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  supportRoles: string[];
  priority: TicketPriority;
  autoAssign: boolean;
}

export enum TicketPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface AnalyticsConfig {
  enabled: boolean;
  trackMessages: boolean;
  trackVoice: boolean;
  trackJoinsLeaves: boolean;
  trackModerationActions: boolean;
  retentionDays: number;
  reportChannel?: string;
  weeklyReports: boolean;
  monthlyReports: boolean;
}