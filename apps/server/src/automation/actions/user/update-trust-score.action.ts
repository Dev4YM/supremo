import { Injectable } from '@nestjs/common';
import { BaseAction } from '../base.action';
import { WorkflowContext, ActionResult } from '../../interfaces/action.interface';
import { TrustScoreService } from '../../../trust-score/trust-score.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class UpdateTrustScoreAction extends BaseAction {
  type = 'update_trust_score';
  name = 'Update Trust Score';
  description = 'Modify a user\'s trust score';
  icon = '⭐';
  category = 'user';

  constructor(
    private trustScoreService: TrustScoreService,
    private prisma: PrismaService,
  ) {
    super();
  }

  async execute(context: WorkflowContext, config: any): Promise<ActionResult> {
    try {
      const discordId = config.userId || context.user?.discordId;
      const change = config.change; // Positive or negative number
      const reason = config.reason || `Automated update: ${context.automation?.name || 'Unknown'}`;

      if (!discordId || change === undefined) {
        return this.failure('User ID and change amount are required');
      }

      if (!context.guildId) {
        return this.failure('Guild ID is required');
      }
      // Find user by discordId to get database ID
      const user = await this.prisma.user.findUnique({
        where: {
          guildId_discordId: {
            guildId: context.guildId,
            discordId,
          },
        },
      });
      
      if (!user) {
        return this.failure('User not found');
      }

      const result = await this.trustScoreService.adjustTrustScore(user.id, change, reason);

      return this.success({ 
        userId: user.id,
        discordId,
        previousScore: result.previousScore,
        newScore: result.newScore,
        change,
      });
    } catch (error: any) {
      return this.failure(error.message || 'Failed to update trust score', { error: error.toString() });
    }
  }

  validate(config: any): boolean {
    return !!(config.change !== undefined);
  }

  getConfigSchema(): any {
    return {
      type: 'object',
      properties: {
        userId: { 
          type: 'string', 
          description: 'User ID (defaults to trigger user)',
        },
        change: { 
          type: 'number', 
          description: 'Amount to change trust score (can be negative)',
        },
        reason: { type: 'string', description: 'Reason for trust score change' },
      },
      required: ['change'],
    };
  }
}

