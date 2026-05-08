import { PrismaClient, IncidentType, Severity, IncidentStatus } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Migrate existing incidents to new Phase 2 format
 */
async function migrateIncidents() {
  console.log('Starting incident migration...');

  const oldIncidents = await prisma.$queryRaw`
    SELECT * FROM incidents_backup
  ` as any[];

  let migrated = 0;
  let errors = 0;

  for (const oldIncident of oldIncidents) {
    try {
      // Map old incident to new format
      const incidentType = mapRuleToIncidentType(oldIncident.ruleTriggered);
      const severity = mapSeverity(oldIncident.severity);
      const status = mapStatus(oldIncident.status);
      const confidence = Math.round((oldIncident.confidenceScore || 0.5) * 100);

      // Convert evidence array to JSON
      const evidence = {
        messages: oldIncident.evidence || [],
        ruleTriggered: oldIncident.ruleTriggered,
        originalEvidence: oldIncident.evidence,
      };

      // Convert recommended action to JSON array
      const recommendedActions = oldIncident.recommendedAction
        ? [{ type: oldIncident.recommendedAction, priority: 'medium' }]
        : [];

      // Update existing incident with new fields
      await prisma.incident.update({
        where: { id: oldIncident.id },
        data: {
          type: incidentType as IncidentType,
          severity: severity as Severity,
          confidence: confidence,
          evidence: evidence,
          recommendedActions: recommendedActions,
          status: status as IncidentStatus,
          falsePositive: oldIncident.status === 'resolved' && oldIncident.resolvedBy === null,
          reviewedBy: oldIncident.resolvedBy,
          reviewedAt: oldIncident.resolvedAt,
          resolution: oldIncident.moderatorNotes || oldIncident.reasoning,
        },
      });

      migrated++;
    } catch (error) {
      console.error(`Error migrating incident ${oldIncident.id}:`, error);
      errors++;
    }
  }

  console.log(`Migration complete: ${migrated} migrated, ${errors} errors`);
}

function mapRuleToIncidentType(ruleTriggered: string): string {
  const rule = ruleTriggered?.toUpperCase() || '';
  
  if (rule.includes('SPAM') || rule.includes('MESSAGE')) return 'MESSAGE_SPAM';
  if (rule.includes('JOIN')) return 'JOIN_SPAM';
  if (rule.includes('MENTION')) return 'MENTION_SPAM';
  if (rule.includes('LINK') || rule.includes('URL')) return 'SUSPICIOUS_LINK';
  if (rule.includes('TOXIC') || rule.includes('PROFANITY')) return 'TOXIC_CONTENT';
  if (rule.includes('RAID')) return 'RAID_DETECTED';
  if (rule.includes('NEW') || rule.includes('ACCOUNT')) return 'NEW_ACCOUNT';
  
  return 'CUSTOM_RULE';
}

function mapSeverity(severity: string): string {
  const sev = severity?.toUpperCase() || 'MEDIUM';
  if (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(sev)) {
    return sev;
  }
  return 'MEDIUM';
}

function mapStatus(status: string): string {
  const stat = status?.toUpperCase() || 'PENDING';
  if (stat === 'RESOLVED') return 'RESOLVED';
  if (stat === 'REJECTED' || stat === 'FALSE_POSITIVE') return 'REJECTED';
  if (stat === 'APPROVED') return 'APPROVED';
  if (stat === 'REVIEWING' || stat === 'IN_PROGRESS') return 'REVIEWING';
  return 'PENDING';
}

migrateIncidents()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

