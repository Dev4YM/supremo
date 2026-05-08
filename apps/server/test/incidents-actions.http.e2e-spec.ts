import { createHash } from 'crypto';
import { INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RbacService } from '../src/auth/rbac.service';
import { IncidentsModule } from '../src/incidents/incidents.module';
import { AuditModule } from '../src/audit/audit.module';
import { AuthModule } from '../src/auth/auth.module';
import { ActionsController } from '../src/actions/actions.controller';
import { ActionsService } from '../src/actions/actions.service';
import { DiscordService } from '../src/discord/discord.service';

function e2eDiscordStub(): Partial<DiscordService> {
  return {
    onModuleInit: jest.fn().mockResolvedValue(undefined),
    client: {
      user: { id: 'e2e-bot' },
      guilds: { cache: { get: jest.fn().mockReturnValue(undefined) } },
      once: jest.fn(),
      on: jest.fn(),
    } as unknown as DiscordService['client'],
    getGuild: jest.fn().mockResolvedValue(null),
    getMember: jest.fn().mockResolvedValue(null),
  } as Partial<DiscordService>;
}

/** Actions routes without loading `DiscordModule` (avoids Discord login + Bull in HTTP e2e). */
@Module({
  imports: [AuditModule, AuthModule, PrismaModule],
  controllers: [ActionsController],
    providers: [ActionsService, { provide: DiscordService, useFactory: () => e2eDiscordStub() as DiscordService }],
})
class ActionsHttpSliceModule {}

const SESSION_TOKEN = 'e2e-incidents-actions-session-token';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const listIncident = {
  id: 'inc-list-1',
  guildId: 'guild-1',
  userId: 'target-user-1',
  status: 'PENDING',
  type: 'MESSAGE_SPAM',
  severity: 'MEDIUM',
  confidence: 72,
  evidence: { messages: [] },
  recommendedActions: [],
  ruleTriggered: 'spam_detection',
  reasoning: null,
  createdAt: new Date('2026-01-02T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  user: {
    discordId: '111',
    username: 'member-one',
    trustScore: 80,
    warningCount: 0,
  },
};

function createPrismaMock() {
  const tokenHash = hashToken(SESSION_TOKEN);
  return {
    authSession: {
      findUnique: jest.fn(async (args: { where: { tokenHash: string } }) => {
        if (args.where.tokenHash === tokenHash) {
          return {
            id: 'sess-ia',
            botUserId: 'user-e2e',
            expiresAt: new Date(Date.now() + 86400000 * 30),
            revokedAt: null,
            botUser: { id: 'user-e2e', status: 'active' },
          };
        }
        return null;
      }),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    botUser: {
      findUnique: jest.fn(async (args: { where: { id: string } }) => {
        if (args.where.id === 'user-e2e') {
          return {
            id: 'user-e2e',
            email: 'ia@example.com',
            username: 'ia-user',
            avatar: null,
            discordId: 'discord-ia',
            status: 'active',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          };
        }
        return null;
      }),
    },
    incident: {
      findMany: jest.fn(async (args: { where?: { guildId?: string } }) => {
        if (args?.where?.guildId === 'guild-1') {
          return [listIncident];
        }
        return [];
      }),
      findFirst: jest.fn(async (args: { where?: { id?: string; guildId?: string } }) => {
        const w = args?.where;
        if (w?.id === 'inc-1' && w?.guildId === 'guild-1') {
          return { ...listIncident, id: 'inc-1' };
        }
        return null;
      }),
      create: jest.fn(async (args: { data: Record<string, unknown>; include?: object }) => ({
        id: 'inc-created',
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          discordId: '999',
          username: 'new-target',
          trustScore: 50,
          warningCount: 1,
        },
      })),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    action: {
      findMany: jest.fn(async (args: { where?: { guildId?: string } }) => {
        if (args?.where?.guildId === 'guild-1') {
          return [
            {
              id: 'act-1',
              guildId: 'guild-1',
              type: 'WARN',
              targetUserId: 'target-user-1',
              status: 'COMPLETED',
              executedAt: new Date('2026-01-03T00:00:00.000Z'),
              user: { discordId: '222', username: 'warned-user' },
            },
          ];
        }
        return [];
      }),
      count: jest.fn().mockResolvedValue(0),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    },
    automation: {
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    jobRun: {
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    automationRun: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  } as unknown as PrismaService;
}

async function createApp(rbac: RbacService): Promise<{ app: INestApplication; moduleRef: TestingModule }> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
      }),
      PrismaModule,
      IncidentsModule,
      ActionsHttpSliceModule,
    ],
  })
    .overrideProvider(PrismaService)
    .useValue(createPrismaMock())
    .overrideProvider(RbacService)
    .useValue(rbac)
    .compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  await app.init();
  return { app, moduleRef };
}

describe('HTTP /api/incidents + /api/actions (supertest)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    const rbac = {
      getUserGuilds: jest.fn().mockResolvedValue(['guild-1']),
      hasGuildAccess: jest.fn(async (_userId: string, guildId: string) => guildId === 'guild-1'),
      resolvePermissions: jest.fn(async (_userId: string, guildId?: string) => {
        if (guildId === 'guild-1') {
          return { permissions: new Set(['INCIDENTS_VIEW', 'ACTIONS_VIEW']) };
        }
        return { permissions: new Set<string>() };
      }),
    } as unknown as RbacService;

    const { app: nestApp } = await createApp(rbac);
    app = nestApp;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /api/incidents returns 401 without session', async () => {
    await request(app.getHttpServer()).get('/api/incidents').set('x-guild-id', 'guild-1').expect(401);
  });

  it('GET /api/incidents returns 403 without x-guild-id', async () => {
    await request(app.getHttpServer()).get('/api/incidents').set('Authorization', `Bearer ${SESSION_TOKEN}`).expect(403);
  });

  it('GET /api/incidents lists with Bearer + x-guild-id + INCIDENTS_VIEW', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/incidents')
      .set('Authorization', `Bearer ${SESSION_TOKEN}`)
      .set('x-guild-id', 'guild-1')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('inc-list-1');
    expect(res.body[0].guildId).toBe('guild-1');
  });

  it('GET /api/incidents/:id returns one incident', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/incidents/inc-1')
      .set('Authorization', `Bearer ${SESSION_TOKEN}`)
      .set('x-guild-id', 'guild-1')
      .expect(200);

    expect(res.body.id).toBe('inc-1');
  });

  it('POST /api/incidents creates with INCIDENTS_VIEW', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/incidents')
      .set('Authorization', `Bearer ${SESSION_TOKEN}`)
      .set('x-guild-id', 'guild-1')
      .set('Content-Type', 'application/json')
      .send({
        userId: 'target-user-1',
        ruleTriggered: 'spam_detection',
        evidence: ['https://discord.com/channels/1/2/3'],
        confidenceScore: 60,
        recommendedAction: 'warn',
        reasoning: 'e2e',
      })
      .expect(201);

    expect(res.body.id).toBe('inc-created');
    expect(res.body.guildId).toBe('guild-1');
    expect(res.body.userId).toBe('target-user-1');
  });

  it('GET /api/actions lists with ACTIONS_VIEW', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/actions')
      .set('Authorization', `Bearer ${SESSION_TOKEN}`)
      .set('x-guild-id', 'guild-1')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('act-1');
    expect(res.body[0].type).toBe('WARN');
  });
});

describe('HTTP /api/incidents PermissionGuard (INCIDENTS_VIEW)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    const rbac = {
      getUserGuilds: jest.fn().mockResolvedValue(['guild-1']),
      hasGuildAccess: jest.fn(async () => true),
      resolvePermissions: jest.fn(async (_userId: string, guildId?: string) => {
        if (guildId === 'guild-1') {
          return { permissions: new Set(['ACTIONS_VIEW']) };
        }
        return { permissions: new Set<string>() };
      }),
    } as unknown as RbacService;

    const { app: nestApp } = await createApp(rbac);
    app = nestApp;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns 403 for GET /api/incidents without INCIDENTS_VIEW', async () => {
    await request(app.getHttpServer())
      .get('/api/incidents')
      .set('Authorization', `Bearer ${SESSION_TOKEN}`)
      .set('x-guild-id', 'guild-1')
      .expect(403);
  });
});

describe('HTTP /api/actions PermissionGuard (ACTIONS_VIEW)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    const rbac = {
      getUserGuilds: jest.fn().mockResolvedValue(['guild-1']),
      hasGuildAccess: jest.fn(async () => true),
      resolvePermissions: jest.fn(async (_userId: string, guildId?: string) => {
        if (guildId === 'guild-1') {
          return { permissions: new Set(['INCIDENTS_VIEW']) };
        }
        return { permissions: new Set<string>() };
      }),
    } as unknown as RbacService;

    const { app: nestApp } = await createApp(rbac);
    app = nestApp;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns 403 for GET /api/actions without ACTIONS_VIEW', async () => {
    await request(app.getHttpServer())
      .get('/api/actions')
      .set('Authorization', `Bearer ${SESSION_TOKEN}`)
      .set('x-guild-id', 'guild-1')
      .expect(403);
  });
});
