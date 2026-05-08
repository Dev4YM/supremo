import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting fresh setup...\n');

  // 1. Clear all data (in correct order to respect foreign keys)
  console.log('🗑️  Clearing existing data...');
  
  await prisma.guildMember.deleteMany();
  await prisma.botUserGlobalRole.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.guild.deleteMany();
  await prisma.botUser.deleteMany();
  
  console.log('✅ Data cleared\n');

  // 2. Seed permissions
  console.log('🔐 Creating permissions...');
  
  const permissionData = [
    { key: 'GUILD_SETTINGS_VIEW', description: 'View guild settings', category: 'settings' },
    { key: 'GUILD_SETTINGS_EDIT', description: 'Edit guild settings', category: 'settings' },
    { key: 'USERS_VIEW', description: 'View users', category: 'users' },
    { key: 'USERS_SYNC', description: 'Sync Discord members', category: 'users' },
    { key: 'USERS_EDIT_NOTES', description: 'Edit user notes', category: 'users' },
    { key: 'USERS_VIEW_TRUST_SCORE', description: 'View trust scores', category: 'users' },
    { key: 'USERS_EDIT_TRUST_SCORE', description: 'Edit trust scores', category: 'users' },
    { key: 'INCIDENTS_VIEW', description: 'View incidents', category: 'moderation' },
    { key: 'INCIDENTS_RESOLVE', description: 'Resolve incidents', category: 'moderation' },
    { key: 'INCIDENTS_DELETE', description: 'Delete incidents', category: 'moderation' },
    { key: 'INCIDENTS_APPROVE_ACTIONS', description: 'Approve moderation actions', category: 'moderation' },
    { key: 'ACTIONS_VIEW', description: 'View actions', category: 'moderation' },
    { key: 'ACTIONS_EXECUTE', description: 'Execute moderation actions', category: 'moderation' },
    { key: 'AUTOMATIONS_VIEW', description: 'View automations', category: 'automation' },
    { key: 'AUTOMATIONS_EDIT', description: 'Edit automations', category: 'automation' },
    { key: 'AUTOMATIONS_CREATE', description: 'Create automations', category: 'automation' },
    { key: 'AUTOMATIONS_DELETE', description: 'Delete automations', category: 'automation' },
    { key: 'AUTOMATIONS_RUN', description: 'Run automations manually', category: 'automation' },
    { key: 'AUTOMATIONS_DEBUG', description: 'Debug automations', category: 'automation' },
    { key: 'COMMANDS_VIEW', description: 'View commands', category: 'commands' },
    { key: 'COMMANDS_EDIT', description: 'Edit commands', category: 'commands' },
    { key: 'COMMANDS_CREATE', description: 'Create commands', category: 'commands' },
    { key: 'COMMANDS_DELETE', description: 'Delete commands', category: 'commands' },
    { key: 'COMMANDS_PERMISSIONS_EDIT', description: 'Edit command permissions', category: 'commands' },
    { key: 'MESSAGES_VIEW', description: 'View messages', category: 'messaging' },
    { key: 'MESSAGES_SEND', description: 'Send messages', category: 'messaging' },
    { key: 'MESSAGES_DELETE', description: 'Delete messages', category: 'messaging' },
    { key: 'CACHE_VIEW', description: 'View cache statistics', category: 'system' },
    { key: 'CACHE_MANAGE', description: 'Manage cache', category: 'system' },
    { key: 'SYSTEM_ADMIN', description: 'System administration access', category: 'system' },
    { key: 'SEED_MANAGE', description: 'Manage seed data', category: 'system' },
    { key: 'ROLES_VIEW', description: 'View roles', category: 'rbac' },
    { key: 'ROLES_EDIT', description: 'Edit roles', category: 'rbac' },
    { key: 'MEMBERS_VIEW', description: 'View guild members', category: 'rbac' },
    { key: 'MEMBERS_INVITE', description: 'Invite members to guild', category: 'rbac' },
    { key: 'MEMBERS_REMOVE', description: 'Remove members from guild', category: 'rbac' },
    { key: 'ANALYTICS_VIEW', description: 'View analytics', category: 'analytics' },
  ];

  const permissions = await Promise.all(
    permissionData.map((perm) =>
      prisma.permission.create({ data: perm })
    )
  );

  console.log(`✅ Created ${permissions.length} permissions\n`);

  // 3. Create OWNER global role
  console.log('👑 Creating OWNER role...');
  
  const ownerRole = await prisma.role.create({
    data: {
      scope: 'GLOBAL',
      key: 'OWNER',
      name: 'Owner',
      description: 'Platform owner with full access to all guilds',
    },
  });

  // Grant all permissions to OWNER
  await prisma.rolePermission.createMany({
    data: permissions.map((perm) => ({
      roleId: ownerRole.id,
      permissionId: perm.id,
      effect: 'ALLOW',
    })),
  });

  console.log('✅ OWNER role created with all permissions\n');

  // 4. Create admin user
  console.log('👤 Creating admin user...');
  
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@supremo.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.botUser.create({
    data: {
      email: adminEmail,
      passwordHash,
      username: adminUsername,
      status: 'active',
    },
  });

  // Assign OWNER role to admin
  await prisma.botUserGlobalRole.create({
    data: {
      botUserId: adminUser.id,
      roleId: ownerRole.id,
    },
  });

  console.log(`✅ Admin user created: ${adminEmail}\n`);

  console.log('✨ Setup complete!\n');
  console.log('📝 Summary:');
  console.log(`   - Admin Email: ${adminEmail}`);
  console.log(`   - Admin Password: ${adminPassword}`);
  console.log(`   - Permissions: ${permissions.length}`);
  console.log(`   - Global Roles: 1 (OWNER)`);
  console.log('\n🚀 You can now:');
  console.log('   1. Start the backend: npm run start:dev');
  console.log('   2. Login at: http://192.168.100.200:3003/login');
  console.log('   3. Connect your Discord server');
}

main()
  .catch((e) => {
    console.error('❌ Setup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
