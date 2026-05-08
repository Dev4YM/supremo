import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowDefinition, ActionBlock } from './interfaces/action.interface';

export interface SubflowDefinition {
  id: string;
  name: string;
  description?: string;
  workflow: WorkflowDefinition;
  inputs: Array<{ name: string; type: string; description?: string; required?: boolean }>;
  outputs: Array<{ name: string; type: string; description?: string }>;
  tags: string[];
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  usageCount: number;
}

export interface WorkflowTemplate {
  id: string;
  key: string;
  name: string;
  description?: string;
  category: string;
  icon?: string;
  tags: string[];
  workflow: WorkflowDefinition;
  configSchema?: any;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedSetupTime: number; // minutes
  requiredPermissions: string[];
  usageCount: number;
  rating: number;
  createdBy: string;
  createdAt: Date;
}

@Injectable()
export class WorkflowTemplateService {
  private readonly logger = new Logger(WorkflowTemplateService.name);
  private subflows: Map<string, SubflowDefinition> = new Map();

  constructor(private prisma: PrismaService) {
    this.loadSubflows();
  }

  /**
   * Load subflows from database/storage
   */
  private async loadSubflows() {
    // In a full implementation, load from database
    this.logger.log('Loaded subflows from storage');
  }

  /**
   * Create a reusable subflow
   */
  async createSubflow(
    name: string,
    description: string,
    workflow: WorkflowDefinition,
    inputs: Array<{ name: string; type: string; description?: string; required?: boolean }>,
    outputs: Array<{ name: string; type: string; description?: string }>,
    createdBy: string,
    tags: string[] = [],
    isPublic: boolean = false,
  ): Promise<SubflowDefinition> {
    const subflowId = `subflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const subflow: SubflowDefinition = {
      id: subflowId,
      name,
      description,
      workflow,
      inputs,
      outputs,
      tags,
      isPublic,
      createdBy,
      createdAt: new Date(),
      usageCount: 0,
    };

    this.subflows.set(subflowId, subflow);
    this.logger.log(`Created subflow: ${name} (${subflowId})`);

    return subflow;
  }

  /**
   * Get subflow by ID
   */
  getSubflow(id: string): SubflowDefinition | null {
    return this.subflows.get(id) || null;
  }

  /**
   * List all subflows
   */
  listSubflows(filters?: {
    tags?: string[];
    isPublic?: boolean;
    createdBy?: string;
  }): SubflowDefinition[] {
    let subflows = Array.from(this.subflows.values());

    if (filters) {
      if (filters.tags && filters.tags.length > 0) {
        subflows = subflows.filter((sf) =>
          filters.tags!.some((tag) => sf.tags.includes(tag))
        );
      }
      if (filters.isPublic !== undefined) {
        subflows = subflows.filter((sf) => sf.isPublic === filters.isPublic);
      }
      if (filters.createdBy) {
        subflows = subflows.filter((sf) => sf.createdBy === filters.createdBy);
      }
    }

    return subflows;
  }

  /**
   * Instantiate a subflow as part of a larger workflow
   */
  async instantiateSubflow(
    subflowId: string,
    inputMappings: Record<string, any>,
  ): Promise<WorkflowDefinition> {
    const subflow = this.getSubflow(subflowId);
    if (!subflow) {
      throw new Error(`Subflow not found: ${subflowId}`);
    }

    // Validate inputs
    for (const input of subflow.inputs) {
      if (input.required && !inputMappings[input.name]) {
        throw new Error(`Required input missing: ${input.name}`);
      }
    }

    // Clone the workflow and apply input mappings
    const workflow = JSON.parse(JSON.stringify(subflow.workflow));

    // Replace placeholders in block configs with actual input values
    workflow.blocks.forEach((block: ActionBlock) => {
      if (block.config) {
        block.config = this.replaceInputPlaceholders(block.config, inputMappings);
      }
    });

    // Increment usage count
    subflow.usageCount++;

    return workflow;
  }

  /**
   * Replace input placeholders in config
   */
  private replaceInputPlaceholders(
    config: any,
    inputMappings: Record<string, any>,
  ): any {
    if (typeof config === 'string') {
      // Replace {{input.name}} with actual values
      let result = config;
      for (const [key, value] of Object.entries(inputMappings)) {
        result = result.replace(new RegExp(`{{input\\.${key}}}`, 'g'), String(value));
      }
      return result;
    } else if (Array.isArray(config)) {
      return config.map((item) => this.replaceInputPlaceholders(item, inputMappings));
    } else if (typeof config === 'object' && config !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(config)) {
        result[key] = this.replaceInputPlaceholders(value, inputMappings);
      }
      return result;
    }
    return config;
  }

  /**
   * Merge subflow into main workflow
   */
  async mergeSubflowIntoWorkflow(
    mainWorkflow: WorkflowDefinition,
    subflowId: string,
    insertAtBlockId: string,
    inputMappings: Record<string, any>,
  ): Promise<WorkflowDefinition> {
    const subflowWorkflow = await this.instantiateSubflow(subflowId, inputMappings);

    // Find the insertion point
    const insertIndex = mainWorkflow.blocks.findIndex((b) => b.id === insertAtBlockId);
    if (insertIndex === -1) {
      throw new Error(`Block not found: ${insertAtBlockId}`);
    }

    // Generate unique IDs for subflow blocks
    const idMapping: Map<string, string> = new Map();
    subflowWorkflow.blocks.forEach((block) => {
      const newId = `${insertAtBlockId}-subflow-${block.id}`;
      idMapping.set(block.id, newId);
    });

    // Remap block IDs
    const remappedBlocks = subflowWorkflow.blocks.map((block) => ({
      ...block,
      id: idMapping.get(block.id)!,
      onSuccess: block.onSuccess ? idMapping.get(block.onSuccess) : undefined,
      onFailure: block.onFailure ? idMapping.get(block.onFailure) : undefined,
      onTrue: block.onTrue ? idMapping.get(block.onTrue) : undefined,
      onFalse: block.onFalse ? idMapping.get(block.onFalse) : undefined,
    }));

    // Connect the main workflow to the subflow
    const insertBlock = mainWorkflow.blocks[insertIndex];
    const subflowEntry = remappedBlocks[0];
    const subflowExit = remappedBlocks[remappedBlocks.length - 1];

    // Link entry
    if (insertBlock.onSuccess) {
      subflowExit.onSuccess = insertBlock.onSuccess;
    }
    insertBlock.onSuccess = subflowEntry.id;

    // Insert subflow blocks after the insertion point
    const newBlocks = [
      ...mainWorkflow.blocks.slice(0, insertIndex + 1),
      ...remappedBlocks,
      ...mainWorkflow.blocks.slice(insertIndex + 1),
    ];

    return {
      ...mainWorkflow,
      blocks: newBlocks,
    };
  }

  /**
   * Extract subflow from workflow (make reusable)
   */
  async extractSubflow(
    workflow: WorkflowDefinition,
    blockIds: string[],
    name: string,
    description: string,
    createdBy: string,
  ): Promise<SubflowDefinition> {
    // Extract selected blocks
    const selectedBlocks = workflow.blocks.filter((b) => blockIds.includes(b.id));

    if (selectedBlocks.length === 0) {
      throw new Error('No blocks selected for extraction');
    }

    // Determine inputs (external references)
    const inputs: Array<{ name: string; type: string; description?: string; required?: boolean }> = [];
    const outputs: Array<{ name: string; type: string; description?: string }> = [];

    // Analyze block configs for external dependencies
    const externalRefs = new Set<string>();
    selectedBlocks.forEach((block) => {
      // Check if block references blocks outside the selection
      if (block.onSuccess && !blockIds.includes(block.onSuccess)) {
        externalRefs.add(block.onSuccess);
      }
      if (block.onFailure && !blockIds.includes(block.onFailure)) {
        externalRefs.add(block.onFailure);
      }
    });

    // Create subflow workflow
    const subflowWorkflow: WorkflowDefinition = {
      entryPoint: selectedBlocks[0].id,
      blocks: selectedBlocks,
      metadata: {
        name,
        description,
        extractedFrom: workflow.metadata?.name,
      },
    };

    return this.createSubflow(
      name,
      description,
      subflowWorkflow,
      inputs,
      outputs,
      createdBy,
      [],
      false,
    );
  }

  /**
   * Get enhanced template with popularity metrics
   */
  async getTemplateWithMetrics(guildId: string, templateKey: string): Promise<any> {
    const template = await this.prisma.automationTemplate.findUnique({
      where: {
        guildId_key: {
          guildId,
          key: templateKey,
        },
      },
    });

    if (!template) {
      return null;
    }

    // Get usage count (how many automations created from this template)
    const usageCount = await this.prisma.automation.count({
      where: {
        description: {
          contains: `[template:${templateKey}]`,
        },
      },
    });

    return {
      ...template,
      usageCount,
      workflow: JSON.parse(template.workflow),
      configSchema: template.configSchema ? JSON.parse(template.configSchema) : null,
    };
  }

  /**
   * Create automation from template with configuration
   */
  async instantiateTemplate(
    guildId: string,
    templateKey: string,
    config: {
      name: string;
      description?: string;
      parameters: Record<string, any>;
      enabled?: boolean;
      createdBy?: string;
    },
  ): Promise<any> {
    const template = await this.prisma.automationTemplate.findUnique({
      where: {
        guildId_key: {
          guildId,
          key: templateKey,
        },
      },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    let workflow = JSON.parse(template.workflow);

    // Apply parameters to workflow
    workflow = this.applyTemplateParameters(workflow, config.parameters);

    // Create automation
    const automation = await this.prisma.automation.create({
      data: {
        guildId,
        name: config.name,
        description: `${config.description || ''} [template:${templateKey}]`,
        type: 'custom',
        triggerType: workflow.triggerType || 'manual',
        workflow: JSON.stringify(workflow),
        enabled: config.enabled !== undefined ? config.enabled : true,
        createdBy: config.createdBy,
      },
    });

    this.logger.log(`Instantiated template ${templateKey} as automation ${automation.id}`);

    return automation;
  }

  /**
   * Apply template parameters to workflow
   */
  private applyTemplateParameters(
    workflow: WorkflowDefinition,
    parameters: Record<string, any>,
  ): WorkflowDefinition {
    const workflowCopy = JSON.parse(JSON.stringify(workflow));

    // Replace {{param.name}} placeholders
    workflowCopy.blocks.forEach((block: ActionBlock) => {
      if (block.config) {
        block.config = this.replaceTemplateParameters(block.config, parameters);
      }
    });

    return workflowCopy;
  }

  /**
   * Replace template parameters recursively
   */
  private replaceTemplateParameters(obj: any, parameters: Record<string, any>): any {
    if (typeof obj === 'string') {
      let result = obj;
      for (const [key, value] of Object.entries(parameters)) {
        result = result.replace(
          new RegExp(`{{param\\.${key}}}`, 'g'),
          String(value)
        );
      }
      return result;
    } else if (Array.isArray(obj)) {
      return obj.map((item) => this.replaceTemplateParameters(item, parameters));
    } else if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceTemplateParameters(value, parameters);
      }
      return result;
    }
    return obj;
  }

  /**
   * Search templates
   */
  async searchTemplates(query: {
    search?: string;
    category?: string;
    tags?: string[];
    difficulty?: string;
    sortBy?: 'popular' | 'recent' | 'name';
    limit?: number;
  }): Promise<any[]> {
    const where: any = {};

    if (query.category) {
      where.category = query.category;
    }

    if (query.tags && query.tags.length > 0) {
      where.tags = {
        hasSome: query.tags,
      };
    }

    const templates = await this.prisma.automationTemplate.findMany({
      where,
      take: query.limit || 50,
    });

    let results = templates.map((t) => ({
      ...t,
      workflow: JSON.parse(t.workflow),
      configSchema: t.configSchema ? JSON.parse(t.configSchema) : null,
    }));

    // Filter by search term
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      results = results.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.description?.toLowerCase().includes(searchLower)
      );
    }

    return results;
  }

  /**
   * Validate template configuration
   */
  validateTemplateConfig(
    configSchema: any,
    parameters: Record<string, any>,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!configSchema || !configSchema.properties) {
      return { valid: true, errors: [] };
    }

    // Check required fields
    if (configSchema.required) {
      for (const requiredField of configSchema.required) {
        if (!parameters[requiredField]) {
          errors.push(`Missing required parameter: ${requiredField}`);
        }
      }
    }

    // Validate types
    for (const [key, value] of Object.entries(parameters)) {
      const fieldSchema = configSchema.properties[key];
      if (fieldSchema && fieldSchema.type) {
        const actualType = typeof value;
        const expectedType = fieldSchema.type;

        if (actualType !== expectedType) {
          errors.push(`Invalid type for ${key}: expected ${expectedType}, got ${actualType}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

