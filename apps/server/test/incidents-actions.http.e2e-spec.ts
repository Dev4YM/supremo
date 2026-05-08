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

function createPrismaMockIncidentMutations(): PrismaService & { __resetResolveIncident: () => void } {
  const tokenHash = hashToken(SESSION_TOKEN);
  const userInclude = { discordId: '100', username: 'subject', trustScore: 50, warningCount: 0 };

  const initialRow = () => ({
    id: 'inc-resolve-1',
    guildId: 'guild-1',
    userId: 'subject-user-1',
    status: 'PENDING',
    type: 'MESSAGE_SPAM',
    severity: 'LOW',
    confidence: 40,
    evidence: {},
    recommendedActions: [],
    ruleTriggered: 'spam',
    reasoning: null,
    moderatorNotes: null as string | null,
    resolvedBy: null as string | null,
    resolvedAt: null as Date | null,
    createdAt: new Date('2026-01-05T00:00:00.000Z'),
    updatedAt: new Date('2026-01-05T00:00:00.000Z'),
    user: userInclude,
  });

  let incidentRow = initialRow();

  const reset = () => {
    incidentRow = initialRow();
  };

  const mock = {
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
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(async (args: { where?: { id?: string; guildId?: string } }) => {
        const w = args?.where;
        if (w?.id === 'inc-resolve-1' && w?.guildId === 'guild-1') {
          return { ...incidentRow, user: userInclude };
        }
        return null;
      }),
      create: jest.fn(),
      update: jest.fn(async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        if (args.where.id === 'inc-resolve-1') {
          incidentRow = {
            ...incidentRow,
            ...args.data,
            user: userInclude,
          } as typeof incidentRow;
          return { ...incidentRow };
        }
        return null;
      }),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    action: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit-mut' }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
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
    __resetResolveIncident: reset,
  } as unknown as PrismaService & { __resetResolveIncident: () => void };

  return mock;
}

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

function createExecuteDiscordStub(): DiscordService {
  const member = {
    id: '777777777777777777',
    user: { bot: false },
    guild: { name: 'E2E Guild' },
    send: jest.fn().mockResolvedValue(undefined),
    timeout: jest.fn().mockResolvedValue(undefined),
  };
  return {
    onModuleInit: jest.fn().mockResolvedValue(undefined),
    client: {
      user: { id: 'e2e-bot-id' },
      guilds: { cache: { get: jest.fn().mockReturnValue(undefined) } },
      once: jest.fn(),
      on: jest.fn(),
    } as unknown as DiscordService['client'],
    getGuild: jest.fn().mockResolvedValue({
      id: 'snowflake-guild',
      ownerId: '999999999999999999',
    }),
    getMember: jest.fn().mockResolvedValue(member),
  } as unknown as DiscordService;
}

function createPrismaMockForActionExecute(): PrismaService {
  const base = createPrismaMock() as unknown as Record<string, unknown>;
  (base.user as Record<string, jest.Mock>).findFirst = jest.fn(
    async (args: { where?: { id?: string; guildId?: string } }) => {
      if (args.where?.id === 'target-user-action' && args.where?.guildId === 'guild-1') {
        return {
          id: 'target-user-action',
          guildId: 'guild-1',
          discordId: '777777777777777777',
          username: 'victim',
        };
      }
      return null;
    },
  );
  base.guild = {
    findUnique: jest.fn(async (args: { where?: { id?: string } }) => {
      if (args.where?.id === 'guild-1') {
        return { id: 'guild-1', discordGuildId: 'snowflake-guild' };
      }
      return null;
    }),
  };
  (base.action as Record<string, jest.Mock>).create = jest.fn(async () => ({
    id: 'act-created-e2e',
    guildId: 'guild-1',
    type: 'LOG_ONLY',
    targetUserId: 'target-user-action',
    status: 'COMPLETED',
    executedAt: new Date('2026-01-04T00:00:00.000Z'),
  }));
  return base as unknown as PrismaService;
}

type CreateAppOverrides = {
  prisma?: PrismaService;
  discord?: DiscordService;
};

async function createApp(
  rbac: RbacService,
  overrides: CreateAppOverrides = {},
): Promise<{ app: INestApplication; moduleRef: TestingModule }> {
  const prisma = overrides.prisma ?? createPrismaMock();
  let moduleBuilder = Test.createTestingModule({
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
    .useValue(prisma)
    .overrideProvider(RbacService)
    .useValue(rbac);

  if (overrides.discord) {
    moduleBuilder = moduleBuilder.overrideProvider(DiscordService).useValue(overrides.discord);
  }

  const moduleRef = await moduleBuilder.compile();

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

describe('HTTP POST /api/actions execute (ACTIONS_EXECUTE)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    const rbac = {
      getUserGuilds: jest.fn().mockResolvedValue(['guild-1']),
      hasGuildAccess: jest.fn(async (_userId: string, guildId: string) => guildId === 'guild-1'),
      resolvePermissions: jest.fn(async (_userId: string, guildId?: string) => {
        if (guildId === 'guild-1') {
          return { permissions: new Set(['ACTIONS_EXECUTE', 'ACTIONS_VIEW']) };
        }
        return { permissions: new Set<string>() };
      }),
    } as unknown as RbacService;

    const { app: nestApp } = await createApp(rbac, {
      prisma: createPrismaMockForActionExecute(),
      discord: createExecuteDiscordStub(),
    });
    app = nestApp;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('POST /api/actions executes note with stubbed Discord + Prisma', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/actions')
      .set('Authorization', `Bearer ${SESSION_TOKEN}`)
      .set('x-guild-id', 'guild-1')
      .set('Content-Type', 'application/json')
      .send({
        userId: 'target-user-action',
        actionType: 'note',
        executor: 'mod-exec-1',
        reason: 'e2e note',
      })
      .expect(201);

    expect(res.body.action?.id).toBe('act-created-e2e');
    expect(res.body.result?.success).toBe(true);
  });
});

describe('HTTP POST /api/actions PermissionGuard (ACTIONS_EXECUTE)', () => {
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

    const { app: nestApp } = await createApp(rbac, {
      prisma: createPrismaMockForActionExecute(),
      discord: createExecuteDiscordStub(),
    });
    app = nestApp;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns 403 for POST /api/actions without ACTIONS_EXECUTE', async () => {
    await request(app.getHttpServer())
      .post('/api/actions')
      .set('Authorization', `Bearer ${SESSION_TOKEN}`)
      .set('x-guild-id', 'guild-1')
      .set('Content-Type', 'application/json')
      .send({
        userId: 'target-user-action',
        actionType: 'note',
        executor: 'mod-exec-1',
      })
      .expect(403);
  });
});

describe('HTTP /api/incidents mutations (INCIDENTS_RESOLVE)', () => {
  let app: INestApplication;
  let prismaMock: PrismaService & { __resetResolveIncident: () => void };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    prismaMock = createPrismaMockIncidentMutations();

    const rbac = {
      getUserGuilds: jest.fn().mockResolvedValue(['guild-1']),
      hasGuildAccess: jest.fn(async (_userId: string, guildId: string) => guildId === 'guild-1'),
      resolvePermissions: jest.fn(async (_userId: string, guildId?: string) => {
        if (guildId === 'guild-1') {
          return { permissions: new Set(['INCIDENTS_VIEW', 'INCIDENTS_RESOLVE']) };
        }
        return { permissions: new Set<string>() };
      }),
    } as unknown as RbacService;

    const { app: nestApp } = await createApp(rbac, { prisma: prismaMock });
    app = nestApp;
  });

  beforeEach(() => {
    prismaMock.__resetResolveIncident();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('PUT /api/incidents/:id updates incident', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/incidents/inc-resolve-1')
      .set('Authorization', `Bearer ${SESSION_TOKEN}`)
      .set('x-guild-id', 'guild-1')
      .set('Content-Type', 'application/json')
      .send({ status: 'approved', moderatorNotes: 'reviewed' })
      .expect(200);

    expect(res.body.status).toBe('APPROVED');
  });

  it('POST /api/incidents/:id/approve approves incident', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/incidents/inc-resolve-1/approve')
      .set('Authorization', `Bearer ${SESSION_TOKEN}`)
      .set('x-guild-id', 'guild-1')
      .set('Content-Type', 'application/json')
      .send({ moderatorId: 'mod-1', notes: 'ok' })
      .expect(201);

    expect(res.body.status).toBe('APPROVED');
  });

  it('POST /api/incidents/:id/reject rejects incident', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/incidents/inc-resolve-1/reject')
      .set('Authorization', `Bearer ${SESSION_TOKEN}`)
      .set('x-guild-id', 'guild-1')
      .set('Content-Type', 'application/json')
      .send({ moderatorId: 'mod-1', notes: 'spam' })
      .expect(201);

    expect(res.body.status).toBe('REJECTED');
  });
});
