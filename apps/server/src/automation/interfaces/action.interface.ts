export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowContext {
  // User context
  user?: {
    id?: string;
    discordId: string;
    username?: string;
    trustScore?: number;
    messageCount?: number;
    joinDate?: Date;
    roles?: string[];
    [key: string]: any;
  };
  
  // Message context
  message?: {
    id: string;
    content: string;
    channelId: string;
    authorId: string;
    [key: string]: any;
  };
  
  // Guild context
  guild?: {
    id: string; // Database guild ID
    discordGuildId?: string; // Discord guild ID
    name: string;
    memberCount?: number;
    [key: string]: any;
  };
  
  // Database guild ID (for multi-tenant support)
  guildId?: string;
  
  // Channel context
  channel?: {
    id: string;
    name: string;
    type: string;
    [key: string]: any;
  };
  
  // Role context (for role_added/removed triggers)
  role?: {
    id: string;
    name: string;
    [key: string]: any;
  };
  
  // Custom variables set during workflow execution
  variables?: Record<string, any>;
  
  // Trigger metadata
  trigger?: {
    type: string;
    timestamp: Date;
    [key: string]: any;
  };
  
  // Automation metadata
  automation?: {
    id: string;
    name: string;
    [key: string]: any;
  };
}

export interface IAction {
  type: string;
  name: string;
  description?: string;
  icon?: string;
  category: string;
  
  execute(context: WorkflowContext, config: any): Promise<ActionResult>;
  validate(config: any): boolean;
  getConfigSchema(): any; // JSON Schema
}

export interface ActionBlock {
  id: string;
  type: string;
  config: any;
  onSuccess?: string; // Next block ID on success
  onFailure?: string; // Next block ID on failure
  onTrue?: string; // Next block ID if condition is true
  onFalse?: string; // Next block ID if condition is false
  wait?: number; // Wait time in milliseconds before next block
}

export interface WorkflowDefinition {
  blocks: ActionBlock[];
  entryPoint: string; // ID of first block
  metadata?: {
    name?: string;
    description?: string;
    tags?: string[];
    version?: string;
    author?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: any;
  };
}

