import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Migrate existing actions to new Phase 2 format
 */
async function migrateActions() {
  console.log('Starting action migration...');

  const oldActions = await prisma.action.findMany({
    include: {
      incident: true,
      user: true,
    },
  });

  let migrated = 0;
  let errors = 0;

  for (const oldAction of oldActions) {
    try {
      // Map old action type to new enum
      const actionType = mapActionType(oldAction.actionType);
      
      // Determine status based on executedAt
      const status = oldAction.executedAt ? 'COMPLETED' : 'PENDING';

      // Build parameters JSON
      const parameters = {
        reason: oldAction.reason,
        duration: oldAction.duration,
        executor: oldAction.executor,
      };

      // Build outcome JSON if executed
      const outcome = oldAction.executedAt
        ? {
            success: true,
            executedAt: oldAction.executedAt,
            executor: oldAction.executor,
          }
        : null;

      // Update existing action with new fields
      // Note: If action doesn't have userId, skip it
      if (!oldAction.userId) {
        console.warn(`Skipping action ${oldAction.id} - no userId`);
        continue;
      }

      await prisma.action.update({
        where: { id: oldAction.id },
        data: {
          type: actionType as any, // Cast to ActionType enum
          targetUserId: oldAction.userId,
          parameters: parameters,
          status: status as any, // Cast to ActionStatus enum
          approvedBy: oldAction.executor || 'system',
          executedBy: oldAction.executedAt ? oldAction.executor : null,
          executedAt: oldAction.executedAt || undefined,
          outcome: outcome,
        },
      });

      migrated++;
    } catch (error) {
      console.error(`Error migrating action ${oldAction.id}:`, error);
      errors++;
    }
  }

  console.log(`Migration complete: ${migrated} migrated, ${errors} errors`);
}

function mapActionType(actionType: string): string {
  const type = actionType?.toUpperCase() || '';
  
  // Map to ActionType enum values
  if (type.includes('TIMEOUT') || type.includes('MUTE')) return 'TIMEOUT';
  if (type.includes('KICK')) return 'KICK';
  if (type.includes('BAN')) return 'BAN';
  if (type.includes('DELETE') || type.includes('PURGE')) return 'DELETE_MESSAGES';
  if (type.includes('ROLE') && type.includes('ADD')) return 'ASSIGN_ROLE';
  if (type.includes('ROLE') && type.includes('REMOVE')) return 'REMOVE_ROLE';
  if (type.includes('WARN')) return 'WARN';
  
  // Default to LOG_ONLY for unknown types (NOTE doesn't exist in ActionType enum)
  return 'LOG_ONLY';
}

migrateActions()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

