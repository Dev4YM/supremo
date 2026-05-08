import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SeedCategory {
  id: string;
  name: string;
  description: string;
  count: number;
  seeded: boolean;
}

export interface SeedStatus {
  initialized: boolean;
  categories: SeedCategory[];
  lastSeededAt?: Date;
  totalItems: number;
  seededItems: number;
}

@Injectable()
export class SeedManagerService implements OnModuleInit {
  private readonly logger = new Logger(SeedManagerService.name);
  private seedStatus: SeedStatus = {
    initialized: false,
    categories: [],
    totalItems: 0,
    seededItems: 0,
  };

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const autoSeed = process.env.AUTO_SEED !== 'false';
    if (autoSeed) {
      this.logger.log('🌱 Auto-seeding enabled - checking for missing seed data...');
      
      // Always seed RBAC first (permissions and roles)
      await this.seedRBAC();
      
      // Bootstrap first admin user if no users exist
      await this.bootstrapAdmin();
      
      // Seed guild-specific defaults (these are now per-guild)
      await this.seedAll();
    }
  }

  /**
   * Seed RBAC system (permissions and global roles)
   * This should run on every startup to ensure permissions are up to date
   */
  async seedRBAC(): Promise<void> {
    this.logger.log('🔐 Seeding RBAC system...');
    
    try {
      // Seed permissions
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
        await this.prisma.permission.upsert({
          where: { key: perm.key },
          update: { description: perm.description, category: perm.category },
          create: perm,
        });
      }

      this.logger.log(`  ✅ Seeded ${permissions.length} permissions`);

      // Seed global roles
      let ownerRole = await this.prisma.role.findFirst({
        where: { scope: 'GLOBAL', guildId: null, key: 'OWNER' },
      });

      if (!ownerRole) {
        ownerRole = await this.prisma.role.create({
          data: {
            scope: 'GLOBAL',
            key: 'OWNER',
            name: 'Owner',
            description: 'Platform owner with full access to all guilds',
          },
        });
      }

      // Grant all permissions to owner
      const allPermissions = await this.prisma.permission.findMany();
      for (const perm of allPermissions) {
        await this.prisma.rolePermission.upsert({
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

      this.logger.log('  ✅ Seeded global OWNER role');

      // Support role (read-only)
      let supportRole = await this.prisma.role.findFirst({
        where: { scope: 'GLOBAL', guildId: null, key: 'SUPPORT' },
      });

      if (!supportRole) {
        supportRole = await this.prisma.role.create({
          data: {
            scope: 'GLOBAL',
            key: 'SUPPORT',
            name: 'Support',
            description: 'Support staff with read-only access',
          },
        });
      }

      // Grant view permissions to support
      const viewPermissionKeys = [
        'GUILD_SETTINGS_VIEW', 'USERS_VIEW', 'INCIDENTS_VIEW', 'ACTIONS_VIEW',
        'AUTOMATIONS_VIEW', 'COMMANDS_VIEW', 'MESSAGES_VIEW', 'CACHE_VIEW',
        'ROLES_VIEW', 'MEMBERS_VIEW', 'ANALYTICS_VIEW',
      ];
      
      const viewPermissions = await this.prisma.permission.findMany({
        where: { key: { in: viewPermissionKeys } },
      });

      for (const perm of viewPermissions) {
        await this.prisma.rolePermission.upsert({
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

      this.logger.log('  ✅ Seeded global SUPPORT role');
      this.logger.log('✅ RBAC seeding completed');
    } catch (error) {
      this.logger.error('❌ RBAC seeding failed:', error);
      throw error;
    }
  }

  /**
   * Bootstrap first admin user from environment variables
   * Only runs if no users exist in the database
   */
  async bootstrapAdmin(): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';

    // Skip if no admin credentials provided
    if (!adminEmail || !adminPassword) {
      this.logger.log('  ⏭️  No ADMIN_EMAIL/ADMIN_PASSWORD provided, skipping admin bootstrap');
      return;
    }

    // Check if any users exist
    const userCount = await this.prisma.botUser.count();
    if (userCount > 0) {
      this.logger.log('  ⏭️  Users already exist, skipping admin bootstrap');
      return;
    }

    this.logger.log('👤 Bootstrapping first admin user...');

    try {
      // Import bcrypt dynamically to avoid circular dependencies
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      // Create admin user
      const user = await this.prisma.botUser.create({
        data: {
          email: adminEmail,
          passwordHash,
          username: adminUsername,
          status: 'active',
        },
      });

      // Assign OWNER role to admin
      const ownerRole = await this.prisma.role.findFirst({
        where: { scope: 'GLOBAL', guildId: null, key: 'OWNER' },
      });

      if (ownerRole) {
        await this.prisma.botUserGlobalRole.create({
          data: {
            botUserId: user.id,
            roleId: ownerRole.id,
          },
        });
      }

      this.logger.log(`  ✅ Created admin user: ${adminEmail} with OWNER role`);
    } catch (error) {
      this.logger.error('❌ Admin bootstrap failed:', error);
      throw error;
    }
  }

  async seedAll(force = false): Promise<SeedStatus> {
    this.logger.log('🌱 Starting guild-specific seed process...');
    const startTime = Date.now();

    try {
      await this.seedCacheConfigs(force);
      await this.seedConfigurations(force);
      await this.seedStaticMessages(force);
      await this.seedAutomationTemplates(force);
      await this.seedBotCommands(force);

      const duration = Date.now() - startTime;
      this.logger.log(`✅ Guild-specific seed process completed in ${duration}ms`);

      // Update status
      this.seedStatus.initialized = true;
      this.seedStatus.lastSeededAt = new Date();
      
      return this.getStatus();
    } catch (error) {
      this.logger.error('❌ Seed process failed:', error);
      throw error;
    }
  }

  /**
   * Get current seed status
   */
  async getStatus(): Promise<SeedStatus> {
    const categories: SeedCategory[] = [];
    let totalItems = 0;
    let seededItems = 0;

    // Check Cache Configs
    const cacheCount = await this.prisma.cacheConfig.count();
    categories.push({
      id: 'cache_configs',
      name: 'Cache Configurations',
      description: 'Intelligent caching system configurations',
      count: cacheCount,
      seeded: cacheCount >= 4, // We expect at least 4 default configs
    });
    totalItems += 4;
    seededItems += Math.min(cacheCount, 4);

    // Check Configurations
    const configCount = await this.prisma.configuration.count();
    categories.push({
      id: 'configurations',
      name: 'System Configurations',
      description: 'Bot configuration settings',
      count: configCount,
      seeded: configCount >= 4,
    });
    totalItems += 4;
    seededItems += Math.min(configCount, 4);

    // Check Static Messages
    const messageCount = await this.prisma.staticMessage.count();
    categories.push({
      id: 'static_messages',
      name: 'Static Messages',
      description: 'Pre-defined bot messages',
      count: messageCount,
      seeded: messageCount >= 2,
    });
    totalItems += 2;
    seededItems += Math.min(messageCount, 2);

    // Check Automation Templates
    const templateCount = await this.prisma.automationTemplate.count();
    categories.push({
      id: 'automation_templates',
      name: 'Automation Templates',
      description: 'Pre-built workflow templates',
      count: templateCount,
      seeded: templateCount >= 3,
    });
    totalItems += 3;
    seededItems += Math.min(templateCount, 3);

    // Check Bot Commands
    const commandCount = await this.prisma.botCommand.count();
    categories.push({
      id: 'bot_commands',
      name: 'Bot Commands',
      description: 'Discord slash commands',
      count: commandCount,
      seeded: commandCount >= 3,
    });
    totalItems += 3;
    seededItems += Math.min(commandCount, 3);

    return {
      initialized: seededItems > 0,
      categories,
      totalItems,
      seededItems,
      lastSeededAt: this.seedStatus.lastSeededAt,
    };
  }

  /**
   * Seed cache configurations
   */
  async seedCacheConfigs(force = false): Promise<number> {
    this.logger.log('📦 Seeding cache configurations...');
    this.logger.warn('  ⚠️  Cache configs are guild-specific - use seedGuildCacheConfigs() instead');
    this.logger.warn('  ⚠️  Skipping global cache config seeding');
    return 0;
  }

  /**
   * Seed system configurations
   */
  async seedConfigurations(force = false): Promise<number> {
    this.logger.log('⚙️  Seeding system configurations...');
    this.logger.warn('  ⚠️  Configurations are guild-specific - use seedGuildConfigurations() instead');
    this.logger.warn('  ⚠️  Skipping global configuration seeding');
    return 0;
  }

  /**
   * Seed static messages
   */
  async seedStaticMessages(force = false): Promise<number> {
    this.logger.log('💬 Seeding static messages...');
    this.logger.warn('  ⚠️  Static messages are guild-specific - use seedGuildStaticMessages() instead');
    this.logger.warn('  ⚠️  Skipping global static message seeding');
    return 0;
  }

  /**
   * Seed automation templates
   */
  async seedAutomationTemplates(force = false): Promise<number> {
    this.logger.log('🤖 Seeding automation templates...');
    this.logger.warn('  ⚠️  Automation templates are guild-specific - use seedGuildAutomationTemplates() instead');
    this.logger.warn('  ⚠️  Skipping global automation template seeding');
    return 0;
  }

  /**
   * Seed bot commands
   */
  async seedBotCommands(force = false): Promise<number> {
    this.logger.log('🤖 Seeding bot commands...');
    this.logger.warn('  ⚠️  Bot commands are guild-specific - use seedGuildBotCommands() instead');
    this.logger.warn('  ⚠️  Skipping global bot command seeding');
    return 0;
  }

  /**
   * Seed guild-specific defaults (called when a guild is first connected)
   */
  async seedGuildDefaults(guildId: string, force = false): Promise<{ created: number; updated: number }> {
    this.logger.log(`🌱 Seeding defaults for guild ${guildId}...`);
    let totalCreated = 0;
    let totalUpdated = 0;

    const cacheResult = await this.seedGuildCacheConfigs(guildId, force);
    totalCreated += cacheResult.created;
    totalUpdated += cacheResult.updated;

    const configResult = await this.seedGuildConfigurations(guildId, force);
    totalCreated += configResult.created;
    totalUpdated += configResult.updated;

    const messagesResult = await this.seedGuildStaticMessages(guildId, force);
    totalCreated += messagesResult.created;
    totalUpdated += messagesResult.updated;

    const templatesResult = await this.seedGuildAutomationTemplates(guildId, force);
    totalCreated += templatesResult.created;
    totalUpdated += templatesResult.updated;

    const commandsResult = await this.seedGuildBotCommands(guildId, force);
    totalCreated += commandsResult.created;
    totalUpdated += commandsResult.updated;

    this.logger.log(`✅ Guild ${guildId} seeded: ${totalCreated} created, ${totalUpdated} updated`);
    return { created: totalCreated, updated: totalUpdated };
  }

  /**
   * Seed cache configurations for a specific guild
   */
  async seedGuildCacheConfigs(guildId: string, force = false): Promise<{ created: number; updated: number }> {
    this.logger.log(`📦 Seeding cache configurations for guild ${guildId}...`);
    let created = 0;
    let updated = 0;

    const configs = [
      {
        key: 'discord_members',
        name: 'Discord Members Cache',
        description: 'Cache Discord guild members to reduce API calls and prevent rate limits',
        enabled: true,
        ttl: 1800000, // 30 minutes in milliseconds (conservative to avoid rate limits)
        autoRefresh: true, // Enable auto-refresh to keep cache fresh
        priority: 10, // Highest priority - refresh first
        maxSize: 10000,
        strategy: 'time-based',
      },
      {
        key: 'discord_roles',
        name: 'Discord Roles Cache',
        description: 'Cache Discord guild roles to reduce API calls',
        enabled: true,
        ttl: 900000, // 15 minutes in milliseconds
        autoRefresh: true, // Enable auto-refresh
        priority: 8, // High priority
        maxSize: 500,
        strategy: 'time-based',
      },
      {
        key: 'discord_channels',
        name: 'Discord Channels Cache',
        description: 'Cache Discord guild channels to reduce API calls',
        enabled: true,
        ttl: 900000, // 15 minutes in milliseconds
        autoRefresh: true, // Enable auto-refresh
        priority: 8, // High priority
        maxSize: 1000,
        strategy: 'time-based',
      },
    ];

    for (const config of configs) {
      const existing = await this.prisma.cacheConfig.findUnique({
        where: {
          guildId_key: {
            guildId,
            key: config.key,
          },
        },
      });

      if (!existing || force) {
        if (existing && force) {
          await this.prisma.cacheConfig.update({
            where: {
              guildId_key: {
                guildId,
                key: config.key,
              },
            },
            data: config,
          });
          updated++;
        } else {
          await this.prisma.cacheConfig.create({
            data: {
              ...config,
              guildId,
            },
          });
          created++;
        }
      }
    }

    return { created, updated };
  }

  /**
   * Seed configurations for a specific guild
   */
  async seedGuildConfigurations(guildId: string, force = false): Promise<{ created: number; updated: number }> {
    this.logger.log(`⚙️  Seeding configurations for guild ${guildId}...`);
    let created = 0;
    let updated = 0;

    const configs = [
      {
        key: 'spam_threshold',
        value: '3',
        description: 'Number of duplicate messages before flagging as spam',
        category: 'moderation',
      },
      {
        key: 'rapid_message_threshold',
        value: '8',
        description: 'Number of messages per minute before flagging',
        category: 'moderation',
      },
      {
        key: 'mention_threshold',
        value: '5',
        description: 'Maximum mentions per message before flagging',
        category: 'moderation',
      },
      {
        key: 'low_trust_threshold',
        value: '30',
        description: 'Trust score below which to flag for review',
        category: 'moderation',
      },
    ];

    for (const config of configs) {
      const existing = await this.prisma.configuration.findUnique({
        where: {
          guildId_key: {
            guildId,
            key: config.key,
          },
        },
      });

      if (!existing || force) {
        if (existing && force) {
          await this.prisma.configuration.update({
            where: {
              guildId_key: {
                guildId,
                key: config.key,
              },
            },
            data: config,
          });
          updated++;
        } else {
          await this.prisma.configuration.upsert({
            where: {
              guildId_key: {
                guildId,
                key: config.key,
              },
            },
            create: {
              ...config,
              guildId,
            },
            update: config,
          });
          created++;
        }
      }
    }

    return { created, updated };
  }

  /**
   * Seed static messages for a specific guild
   */
  async seedGuildStaticMessages(guildId: string, force = false): Promise<{ created: number; updated: number }> {
    this.logger.log(`💬 Seeding static messages for guild ${guildId}...`);
    let created = 0;
    let updated = 0;

    const messages = [
      {
        key: 'welcome',
        content: 'Welcome to {guild}, {user}! We\'re glad to have you here.',
        enabled: true,
        type: 'welcome',
      },
      {
        key: 'rules',
        content: 'Please read and follow our server rules.',
        enabled: false,
        type: 'rules',
      },
    ];

    for (const message of messages) {
      const existing = await this.prisma.staticMessage.findUnique({
        where: {
          guildId_key: {
            guildId,
            key: message.key,
          },
        },
      });

      if (!existing || force) {
        if (existing && force) {
          await this.prisma.staticMessage.update({
            where: {
              guildId_key: {
                guildId,
                key: message.key,
              },
            },
            data: message,
          });
          updated++;
        } else {
          await this.prisma.staticMessage.upsert({
            where: {
              guildId_key: {
                guildId,
                key: message.key,
              },
            },
            create: {
              ...message,
              guildId,
            },
            update: message,
          });
          created++;
        }
      }
    }

    return { created, updated };
  }

  /**
   * Seed automation templates for a specific guild
   */
  async seedGuildAutomationTemplates(guildId: string, force = false): Promise<{ created: number; updated: number }> {
    this.logger.log(`🤖 Seeding automation templates for guild ${guildId}...`);
    let created = 0;
    let updated = 0;

    const templates = [
      {
        key: 'welcome_package',
        name: 'Welcome Package',
        description: 'Complete welcome flow with role assignment and DM',
        category: 'onboarding',
        icon: '👋',
        tags: ['welcome', 'onboarding'],
        workflow: {
          steps: [
            { type: 'sendDM', config: { message: 'Welcome!' } },
            { type: 'assignRole', config: { roleId: '{newcomer_role}' } },
          ],
        },
      },
    ];

    for (const template of templates) {
      const existing = await this.prisma.automationTemplate.findUnique({
        where: {
          guildId_key: {
            guildId,
            key: template.key,
          },
        },
      });

      if (!existing || force) {
        if (existing && force) {
          await this.prisma.automationTemplate.update({
            where: {
              guildId_key: {
                guildId,
                key: template.key,
              },
            },
            data: {
              ...template,
              workflow: JSON.stringify(template.workflow),
            },
          });
          updated++;
        } else {
          await this.prisma.automationTemplate.upsert({
            where: {
              guildId_key: {
                guildId,
                key: template.key,
              },
            },
            create: {
              guildId,
              key: template.key,
              name: template.name,
              description: template.description,
              category: template.category,
              icon: template.icon,
              tags: template.tags,
              workflow: JSON.stringify(template.workflow),
            },
            update: {
              name: template.name,
              description: template.description,
              category: template.category,
              icon: template.icon,
              tags: template.tags,
              workflow: JSON.stringify(template.workflow),
            },
          });
          created++;
        }
      }
    }

    return { created, updated };
  }

  /**
   * Seed bot commands for a specific guild
   */
  async seedGuildBotCommands(guildId: string, force = false): Promise<{ created: number; updated: number }> {
    this.logger.log(`🎮 Seeding bot commands for guild ${guildId}...`);
    let created = 0;
    let updated = 0;

    const commands = [
      {
        name: 'ping',
        description: 'Check if bot is responding',
        category: 'utility',
        isSystem: true,
        enabled: true,
        action: 'message',
        actionConfig: JSON.stringify({ content: 'Pong! 🏓' }),
        cooldown: 0,
      },
    ];

    for (const command of commands) {
      const existing = await this.prisma.botCommand.findUnique({
        where: {
          guildId_name: {
            guildId,
            name: command.name,
          },
        },
      });

      if (!existing || force) {
        if (existing && force) {
          await this.prisma.botCommand.update({
            where: {
              guildId_name: {
                guildId,
                name: command.name,
              },
            },
            data: command,
          });
          updated++;
        } else {
          await this.prisma.botCommand.upsert({
            where: {
              guildId_name: {
                guildId,
                name: command.name,
              },
            },
            create: {
              ...command,
              guildId,
            },
            update: command,
          });
          created++;
        }
      }
    }

    return { created, updated };
  }

  /**
   * Reset all seed data (dangerous!)
   */
  async resetAll(): Promise<void> {
    this.logger.warn('⚠️  RESETTING ALL SEED DATA - This cannot be undone!');
    
    // Delete in reverse order of dependencies
    await this.prisma.botCommand.deleteMany({ where: { isSystem: true } });
    await this.prisma.automationTemplate.deleteMany();
    await this.prisma.staticMessage.deleteMany();
    await this.prisma.configuration.deleteMany();
    // Don't delete cache configs as they might be in use
    
    this.logger.warn('✅ All seed data has been reset');
  }

  /**
   * Seed specific category
   */
  async seedCategory(category: string, force = false): Promise<number> {
    switch (category) {
      case 'cache_configs':
        return this.seedCacheConfigs(force);
      case 'configurations':
        return this.seedConfigurations(force);
      case 'static_messages':
        return this.seedStaticMessages(force);
      case 'automation_templates':
        return this.seedAutomationTemplates(force);
      case 'bot_commands':
        return this.seedBotCommands(force);
      default:
        throw new Error(`Unknown category: ${category}`);
    }
  }
}

