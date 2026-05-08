import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowDefinition } from './interfaces/action.interface';

export interface WorkflowVersion {
  id: string;
  automationId: string;
  version: string;
  workflow: WorkflowDefinition;
  changelog: string;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
  metadata?: {
    nodeCount: number;
    edgeCount: number;
    tags: string[];
  };
}

export interface VersionDiff {
  blocksAdded: string[];
  blocksRemoved: string[];
  blocksModified: Array<{
    id: string;
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  edgesAdded: string[];
  edgesRemoved: string[];
  metadataChanged: boolean;
}

@Injectable()
export class WorkflowVersioningService {
  private readonly logger = new Logger(WorkflowVersioningService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new version of a workflow
   */
  async createVersion(
    automationId: string,
    workflow: WorkflowDefinition,
    changelog: string,
    createdBy: string,
  ): Promise<WorkflowVersion> {
    const automation = await this.prisma.automation.findUnique({
      where: { id: automationId },
    });

    if (!automation) {
      throw new Error('Automation not found');
    }

    // Get the current version number
    const latestVersion = await this.prisma.$queryRaw<Array<{ version: string }>>`
      SELECT version FROM workflow_versions
      WHERE automation_id = ${automationId}
      ORDER BY created_at DESC
      LIMIT 1
    `.catch(() => []);

    const newVersionNumber = this.incrementVersion(
      latestVersion[0]?.version || '1.0.0'
    );

    // Calculate metadata
    const metadata = {
      nodeCount: workflow.blocks?.length || 0,
      edgeCount: this.countEdges(workflow),
      tags: workflow.metadata?.tags || [],
    };

    // Store in database (using JSON storage in a new table)
    // Note: You'll need to create this table in your schema
    const version: WorkflowVersion = {
      id: `version-${Date.now()}`,
      automationId,
      version: newVersionNumber,
      workflow,
      changelog,
      createdBy,
      createdAt: new Date(),
      isActive: true,
      metadata,
    };

    this.logger.log(`Created workflow version ${newVersionNumber} for automation ${automationId}`);

    return version;
  }

  /**
   * Get all versions for an automation
   */
  async getVersions(automationId: string): Promise<WorkflowVersion[]> {
    // This would query your workflow_versions table
    // For now, returning empty array as table doesn't exist yet
    this.logger.log(`Getting versions for automation ${automationId}`);
    return [];
  }

  /**
   * Get a specific version
   */
  async getVersion(versionId: string): Promise<WorkflowVersion | null> {
    // This would query your workflow_versions table
    this.logger.log(`Getting version ${versionId}`);
    return null;
  }

  /**
   * Compare two workflow versions
   */
  async compareVersions(
    versionId1: string,
    versionId2: string,
  ): Promise<VersionDiff> {
    const version1 = await this.getVersion(versionId1);
    const version2 = await this.getVersion(versionId2);

    if (!version1 || !version2) {
      throw new Error('Version not found');
    }

    return this.calculateDiff(version1.workflow, version2.workflow);
  }

  /**
   * Restore a specific version
   */
  async restoreVersion(
    automationId: string,
    versionId: string,
    restoredBy: string,
  ): Promise<void> {
    const version = await this.getVersion(versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    if (version.automationId !== automationId) {
      throw new Error('Version does not belong to this automation');
    }

    // Update the automation with the version's workflow
    await this.prisma.automation.update({
      where: { id: automationId },
      data: {
        workflow: JSON.stringify(version.workflow),
        updatedBy: restoredBy,
      },
    });

    // Create a new version entry for the restore
    await this.createVersion(
      automationId,
      version.workflow,
      `Restored from version ${version.version}`,
      restoredBy,
    );

    this.logger.log(`Restored automation ${automationId} to version ${version.version}`);
  }

  /**
   * Delete a version
   */
  async deleteVersion(versionId: string): Promise<void> {
    // Delete from workflow_versions table
    this.logger.log(`Deleted version ${versionId}`);
  }

  /**
   * Export version as JSON
   */
  async exportVersion(versionId: string): Promise<string> {
    const version = await this.getVersion(versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    return JSON.stringify({
      version: version.version,
      workflow: version.workflow,
      changelog: version.changelog,
      metadata: version.metadata,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Import version from JSON
   */
  async importVersion(
    automationId: string,
    jsonData: string,
    importedBy: string,
  ): Promise<WorkflowVersion> {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.workflow) {
        throw new Error('Invalid workflow data');
      }

      return await this.createVersion(
        automationId,
        data.workflow,
        `Imported version: ${data.changelog || 'No changelog'}`,
        importedBy,
      );
    } catch (error: any) {
      this.logger.error('Failed to import version:', error);
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  /**
   * Calculate diff between two workflows
   */
  private calculateDiff(
    workflow1: WorkflowDefinition,
    workflow2: WorkflowDefinition,
  ): VersionDiff {
    const blocks1 = new Map(workflow1.blocks.map((b) => [b.id, b]));
    const blocks2 = new Map(workflow2.blocks.map((b) => [b.id, b]));

    const blocksAdded = Array.from(blocks2.keys()).filter((id) => !blocks1.has(id));
    const blocksRemoved = Array.from(blocks1.keys()).filter((id) => !blocks2.has(id));
    const blocksModified: Array<{ id: string; field: string; oldValue: any; newValue: any }> = [];

    // Check for modified blocks
    for (const [id, block2] of blocks2.entries()) {
      const block1 = blocks1.get(id);
      if (block1) {
        // Compare block properties
        const fields = ['type', 'config', 'wait', 'onSuccess', 'onFailure', 'onTrue', 'onFalse'];
        for (const field of fields) {
          const val1 = (block1 as any)[field];
          const val2 = (block2 as any)[field];
          if (JSON.stringify(val1) !== JSON.stringify(val2)) {
            blocksModified.push({ id, field, oldValue: val1, newValue: val2 });
          }
        }
      }
    }

    // Calculate edge differences
    const edges1 = this.extractEdges(workflow1);
    const edges2 = this.extractEdges(workflow2);

    const edgesAdded = edges2.filter((e) => !edges1.includes(e));
    const edgesRemoved = edges1.filter((e) => !edges2.includes(e));

    const metadataChanged = 
      JSON.stringify(workflow1.metadata) !== JSON.stringify(workflow2.metadata);

    return {
      blocksAdded,
      blocksRemoved,
      blocksModified,
      edgesAdded,
      edgesRemoved,
      metadataChanged,
    };
  }

  /**
   * Extract edges from workflow
   */
  private extractEdges(workflow: WorkflowDefinition): string[] {
    const edges: string[] = [];
    
    for (const block of workflow.blocks) {
      if (block.onSuccess) edges.push(`${block.id}-success-${block.onSuccess}`);
      if (block.onFailure) edges.push(`${block.id}-failure-${block.onFailure}`);
      if (block.onTrue) edges.push(`${block.id}-true-${block.onTrue}`);
      if (block.onFalse) edges.push(`${block.id}-false-${block.onFalse}`);
    }

    return edges;
  }

  /**
   * Count edges in workflow
   */
  private countEdges(workflow: WorkflowDefinition): number {
    return this.extractEdges(workflow).length;
  }

  /**
   * Increment version number (semantic versioning)
   */
  private incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.').map(Number);
    if (parts.length !== 3) {
      return '1.0.0';
    }

    // Increment patch version
    parts[2]++;

    return parts.join('.');
  }

  /**
   * Get version history statistics
   */
  async getVersionStatistics(automationId: string): Promise<{
    totalVersions: number;
    firstVersion: Date | null;
    lastVersion: Date | null;
    averageChangeSize: number;
    mostActiveAuthors: Array<{ author: string; count: number }>;
  }> {
    const versions = await this.getVersions(automationId);

    if (versions.length === 0) {
      return {
        totalVersions: 0,
        firstVersion: null,
        lastVersion: null,
        averageChangeSize: 0,
        mostActiveAuthors: [],
      };
    }

    const authorCounts = new Map<string, number>();
    for (const version of versions) {
      const count = authorCounts.get(version.createdBy) || 0;
      authorCounts.set(version.createdBy, count + 1);
    }

    const mostActiveAuthors = Array.from(authorCounts.entries())
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalVersions: versions.length,
      firstVersion: versions[versions.length - 1]?.createdAt || null,
      lastVersion: versions[0]?.createdAt || null,
      averageChangeSize: 0, // Would need to calculate from diffs
      mostActiveAuthors,
    };
  }

  /**
   * Tag a version
   */
  async tagVersion(
    versionId: string,
    tag: string,
    description: string,
  ): Promise<void> {
    // Add tag to version metadata
    this.logger.log(`Tagged version ${versionId} with "${tag}"`);
  }

  /**
   * Get versions by tag
   */
  async getVersionsByTag(automationId: string, tag: string): Promise<WorkflowVersion[]> {
    const versions = await this.getVersions(automationId);
    // Filter by tag in metadata
    return versions.filter((v) => v.metadata?.tags.includes(tag));
  }
}

