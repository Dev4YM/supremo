import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPermissions() {
  console.log('🔐 Seeding permissions...');

  const permissions = [
    // Guild Settings
    { key: 'GUILD_SETTINGS_VIEW', description: 'View guild settings', category: 'settings' },
    { key: 'GUILD_SETTINGS_EDIT', description: 'Edit guild settings', category: 'settings' },

    // Users
    { key: 'USERS_VIEW', description: 'View users', category: 'users' },
    { key: 'USERS_SYNC', description: 'Sync Discord members', category: 'users' },
    { key: 'USERS_EDIT_NOTES', description: 'Edit user notes', category: 'users' },
    { key: 'USERS_VIEW_TRUST_SCORE', description: 'View trust scores', category: 'users' },
    { key: 'USERS_EDIT_TRUST_SCORE', description: 'Edit trust scores', category: 'users' },

    // Incidents
    { key: 'INCIDENTS_VIEW', description: 'View incidents', category: 'moderation' },
    { key: 'INCIDENTS_RESOLVE', description: 'Resolve incidents', category: 'moderation' },
    { key: 'INCIDENTS_DELETE', description: 'Delete incidents', category: 'moderation' },
    { key: 'INCIDENTS_APPROVE_ACTIONS', description: 'Approve moderation actions', category: 'moderation' },

    // Actions
    { key: 'ACTIONS_VIEW', description: 'View actions', category: 'moderation' },
    { key: 'ACTIONS_EXECUTE', description: 'Execute moderation actions', category: 'moderation' },

    // Automations
    { key: 'AUTOMATIONS_VIEW', description: 'View automations', category: 'automation' },
    { key: 'AUTOMATIONS_EDIT', description: 'Edit automations', category: 'automation' },
    { key: 'AUTOMATIONS_CREATE', description: 'Create automations', category: 'automation' },
    { key: 'AUTOMATIONS_DELETE', description: 'Delete automations', category: 'automation' },
    { key: 'AUTOMATIONS_RUN', description: 'Run automations manually', category: 'automation' },
    { key: 'AUTOMATIONS_DEBUG', description: 'Debug automations', category: 'automation' },

    // Commands
    { key: 'COMMANDS_VIEW', description: 'View commands', category: 'commands' },
    { key: 'COMMANDS_EDIT', description: 'Edit commands', category: 'commands' },
    { key: 'COMMANDS_CREATE', description: 'Create commands', category: 'commands' },
    { key: 'COMMANDS_DELETE', description: 'Delete commands', category: 'commands' },
    { key: 'COMMANDS_PERMISSIONS_EDIT', description: 'Edit command permissions', category: 'commands' },

    // Messages
    { key: 'MESSAGES_VIEW', description: 'View messages', category: 'messaging' },
    { key: 'MESSAGES_SEND', description: 'Send messages', category: 'messaging' },
    { key: 'MESSAGES_DELETE', description: 'Delete messages', category: 'messaging' },

    // Cache
    { key: 'CACHE_VIEW', description: 'View cache statistics', category: 'system' },
    { key: 'CACHE_MANAGE', description: 'Manage cache', category: 'system' },
    { key: 'SYSTEM_ADMIN', description: 'System administration access', category: 'system' },

    // Seed
    { key: 'SEED_MANAGE', description: 'Manage seed data', category: 'system' },

    // Roles & Members
    { key: 'ROLES_VIEW', description: 'View roles', category: 'rbac' },
    { key: 'ROLES_EDIT', description: 'Edit roles', category: 'rbac' },
    { key: 'MEMBERS_VIEW', description: 'View guild members', category: 'rbac' },
    { key: 'MEMBERS_INVITE', description: 'Invite members to guild', category: 'rbac' },
    { key: 'MEMBERS_REMOVE', description: 'Remove members from guild', category: 'rbac' },

    // Analytics
    { key: 'ANALYTICS_VIEW', description: 'View analytics', category: 'analytics' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: {
        description: perm.description,
        category: perm.category,
      },
      create: perm,
    });
  }

  console.log(`✅ Seeded ${permissions.length} permissions`);
}

async function seedGlobalRoles() {
  console.log('👑 Seeding global roles...');

  // Owner role
  let ownerRole = await prisma.role.findFirst({
    where: {
      scope: 'GLOBAL',
      guildId: null,
      key: 'OWNER',
    },
  });

  if (!ownerRole) {
    ownerRole = await prisma.role.create({
      data: {
        scope: 'GLOBAL',
        key: 'OWNER',
        name: 'Owner',
        description: 'Platform owner with full access to all guilds',
      },
    });
  }

  // Grant all permissions to owner
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: ownerRole.id,
          permissionId: perm.id,
        },
      },
      update: { effect: 'ALLOW' },
      create: {
        roleId: ownerRole.id,
        permissionId: perm.id,
        effect: 'ALLOW',
      },
    });
  }

  // Support role (read-only)
  let supportRole = await prisma.role.findFirst({
    where: {
      scope: 'GLOBAL',
      guildId: null,
      key: 'SUPPORT',
    },
  });

  if (!supportRole) {
    supportRole = await prisma.role.create({
      data: {
        scope: 'GLOBAL',
        key: 'SUPPORT',
        name: 'Support',
        description: 'Support staff with read-only access',
      },
    });
  }

  // Grant view permissions to support
  const viewPermissions = await prisma.permission.findMany({
    where: {
      key: {
        in: [
          'GUILD_SETTINGS_VIEW',
          'USERS_VIEW',
          'INCIDENTS_VIEW',
          'ACTIONS_VIEW',
          'AUTOMATIONS_VIEW',
          'COMMANDS_VIEW',
          'MESSAGES_VIEW',
          'CACHE_VIEW',
          'ROLES_VIEW',
          'MEMBERS_VIEW',
          'ANALYTICS_VIEW',
        ],
      },
    },
  });

  for (const perm of viewPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: supportRole.id,
          permissionId: perm.id,
        },
      },
      update: { effect: 'ALLOW' },
      create: {
        roleId: supportRole.id,
        permissionId: perm.id,
        effect: 'ALLOW',
      },
    });
  }

  console.log('✅ Seeded global roles');
}

async function main() {
  console.log('🌱 Seeding RBAC system...');

  await seedPermissions();
  await seedGlobalRoles();

  console.log('✅ RBAC seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ RBAC seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

