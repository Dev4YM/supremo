/**
 * Script to create the first admin user
 * Run: npx ts-node src/setup/create-first-admin.ts
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
  console.log('🔐 Create First Admin User\n');

  try {
    // Get user input
    const email = await question('Email: ');
    const username = await question('Username: ');
    const password = await question('Password (min 8 chars): ');

    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters');
      process.exit(1);
    }

    // Check if user exists
    const existing = await prisma.botUser.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existing) {
      console.error('❌ User with this email or username already exists');
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.botUser.create({
      data: {
        email,
        username,
        passwordHash,
        status: 'active',
      },
    });

    console.log(`✅ User created: ${user.id}`);

    // Get GLOBAL_OWNER role
    const ownerRole = await prisma.role.findFirst({
      where: {
        scope: 'GLOBAL',
        key: 'OWNER',
      },
    });

    if (!ownerRole) {
      console.error('❌ GLOBAL_OWNER role not found. Please run seed-rbac.ts first');
      process.exit(1);
    }

    // Assign GLOBAL_OWNER role
    await prisma.botUserGlobalRole.create({
      data: {
        botUserId: user.id,
        roleId: ownerRole.id,
      },
    });

    console.log('✅ Assigned GLOBAL_OWNER role');
    console.log('\n🎉 Setup complete! You can now login with:');
    console.log(`   Email: ${email}`);
    console.log(`   Username: ${username}`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();

