import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Build UserIntelligence profiles from existing user data
 */
async function migrateUsers() {
  console.log('Starting user intelligence migration...');

  const users = await prisma.user.findMany({
    include: {
      incidents: true,
      actions: true,
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  let migrated = 0;
  let errors = 0;

  for (const user of users) {
    try {
      // Calculate account age (if we have user creation date)
      // For now, use joinedAt as proxy
      const accountAge = user.joinedAt
        ? Math.floor((Date.now() - user.joinedAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Calculate server join age
      const serverJoinAge = user.joinedAt
        ? Math.floor((Date.now() - user.joinedAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Calculate clean record days
      const lastIncident = user.incidents
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      const cleanRecordDays = lastIncident
        ? Math.floor((Date.now() - lastIncident.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : serverJoinAge;

      // Determine risk level based on incidents and trust score
      const riskLevel = determineRiskLevel(user.trustScore, user.incidents.length);

      // Build risk flags
      const riskFlags: string[] = [];
      if (accountAge < 7) riskFlags.push('NEW_ACCOUNT');
      if (user.incidents.length > 3) riskFlags.push('MULTIPLE_INCIDENTS');
      if (user.trustScore < 30) riskFlags.push('LOW_TRUST_SCORE');
      if (user.warningCount > 5) riskFlags.push('HIGH_WARNING_COUNT');

      // Build detailed profile
      const profile = {
        accountAge,
        serverJoinAge,
        messageCount: user.messageCount,
        incidentCount: user.incidents.length,
        actionCount: user.actions.length,
        trustScore: user.trustScore,
        warningCount: user.warningCount,
        lastActivity: user.lastActivity,
        lastIncidentDate: lastIncident?.createdAt,
      };

      // Create or update UserIntelligence
      await prisma.userIntelligence.upsert({
        where: {
          guildId_userId: {
            guildId: user.guildId,
            userId: user.id,
          },
        },
        create: {
          guildId: user.guildId,
          userId: user.id,
          trustScore: user.trustScore,
          riskLevel: riskLevel as any, // Cast to RiskLevel enum
          riskFlags,
          accountAge,
          serverJoinAge,
          messageCount: user.messageCount,
          incidentCount: user.incidents.length,
          cleanRecordDays,
          lastActivity: user.lastActivity,
          profile: profile as any, // Cast to Json
        },
        update: {
          trustScore: user.trustScore,
          riskLevel: riskLevel as any,
          riskFlags,
          accountAge,
          serverJoinAge,
          messageCount: user.messageCount,
          incidentCount: user.incidents.length,
          cleanRecordDays,
          lastActivity: user.lastActivity,
          profile: profile as any,
        },
      });

      migrated++;
    } catch (error) {
      console.error(`Error migrating user ${user.id}:`, error);
      errors++;
    }
  }

  console.log(`Migration complete: ${migrated} migrated, ${errors} errors`);
}

function determineRiskLevel(trustScore: number, incidentCount: number): string {
  // Map to RiskLevel enum values
  if (trustScore < 20 || incidentCount > 5) return 'CRITICAL';
  if (trustScore < 40 || incidentCount > 3) return 'HIGH';
  if (trustScore < 60 || incidentCount > 1) return 'MEDIUM';
  if (trustScore < 80 || incidentCount > 0) return 'LOW';
  return 'NONE';
}

migrateUsers()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

