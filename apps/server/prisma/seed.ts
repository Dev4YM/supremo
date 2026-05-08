import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Main seed function
 * 
 * NOTE: This seed file only seeds GLOBAL data (like RBAC permissions).
 * Guild-specific data (cache configs, static messages, configurations, etc.)
 * is automatically seeded when a guild is first connected via the per-guild
 * seeding strategy implemented in SeedManagerService.
 * 
 * To seed RBAC permissions, run: npm run prisma:seed:rbac
 */
async function main() {
  console.log('🌱 Seeding database...');
  console.log('');
  console.log('⚠️  NOTE: Guild-specific data is now seeded automatically when a guild is connected.');
  console.log('⚠️  This seed file only handles global data (RBAC permissions).');
  console.log('⚠️  Run "npm run prisma:seed:rbac" to seed RBAC permissions.');
  console.log('');
  console.log('✅ Global seed completed!');
  console.log('   Guild-specific defaults will be seeded automatically when guilds are connected.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

