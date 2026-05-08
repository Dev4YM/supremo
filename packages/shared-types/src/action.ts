export interface AutomationAction {
  id: string;
  type: ActionType;
  name: string;
  description: string;
  config: ActionConfig;
  conditions: ActionCondition[];
  enabled: boolean;
  priority: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum ActionType {
  SEND_MESSAGE = 'send_message',
  SEND_DM = 'send_dm',
  ADD_ROLE = 'add_role',
  REMOVE_ROLE = 'remove_role',
  KICK_USER = 'kick_user',
  BAN_USER = 'ban_user',
  MUTE_USER = 'mute_user',
  DELETE_MESSAGE = 'delete_message',
  CREATE_THREAD = 'create_thread',
  SEND_WEBHOOK = 'send_webhook',
  LOG_EVENT = 'log_event',
  SCHEDULE_REMINDER = 'schedule_reminder',
  TRIGGER_WORKFLOW = 'trigger_workflow'
}

export interface ActionConfig {
  [key: string]: any;
  // Message actions
  content?: string;
  embeds?: any[];
  components?: any[];
  
  // Role actions
  roleId?: string;
  roleName?: string;
  
  // Moderation actions
  reason?: string;
  duration?: number;
  deleteMessageDays?: number;
  
  // Webhook actions
  url?: string;
  payload?: Record<string, any>;
  
  // Workflow actions
  workflowId?: string;
  variables?: Record<string, any>;
}

export interface ActionCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  logicalOperator?: LogicalOperator;
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  REGEX = 'regex',
  IN_ARRAY = 'in_array',
  NOT_IN_ARRAY = 'not_in_array'
}

export enum LogicalOperator {
  AND = 'and',
  OR = 'or'
}

export interface ActionResult {
  success: boolean;
  actionId: string;
  executedAt: Date;
  duration: number;
  error?: string;
  metadata: Record<string, any>;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  triggeredBy: string;
  triggeredAt: Date;
  completedAt?: Date;
  status: ExecutionStatus;
  steps: StepExecution[];
  variables: Record<string, any>;
  error?: string;
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface StepExecution {
  stepId: string;
  actionId: string;
  startedAt: Date;
  completedAt?: Date;
  status: ExecutionStatus;
  result?: ActionResult;
  error?: string;
}