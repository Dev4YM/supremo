import { createHash } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApiModule } from '../src/api/api.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RbacService } from '../src/auth/rbac.service';
import { SessionService } from '../src/auth/session.service';

const SESSION_TOKEN = 'e2e-session-token-value-used-only-in-tests';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function createPrismaMockForApiController() {
  const tokenHash = hashToken(SESSION_TOKEN);
  return {
    authSession: {
      findUnique: jest.fn(async (args: { where: { tokenHash: string } }) => {
        if (args.where.tokenHash === tokenHash) {
          return {
            id: 'sess-e2e',
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
            email: 'e2e@example.com',
            username: 'e2e-user',
            avatar: null,
            discordId: 'discord-e2e',
            status: 'active',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          };
        }
        return null;
      }),
    },
    user: {
      count: jest.fn().mockResolvedValue(10),
    },
    incident: {
      count: jest.fn(async (args: { where?: { status?: string; guildId?: string } }) => {
        if (args?.where?.status === 'PENDING') {
          return 2;
        }
        return 5;
      }),
      groupBy: jest.fn(async (args: { by?: string[] }) => {
        if (Array.isArray(args.by) && args.by[0] === 'ruleTriggered') {
          return [
            { ruleTriggered: 'anti-spam', _count: { id: 8 } },
            { ruleTriggered: 'links', _count: { id: 3 } },
          ];
        }
        return [];
      }),
    },
    action: {
      count: jest.fn().mockResolvedValue(3),
    },
    automation: {
      count: jest.fn(async (args: { where?: { enabled?: boolean; guildId?: string } }) => {
        if (args?.where?.enabled === true) {
          return 4;
        }
        return 9;
      }),
      findFirst: jest.fn().mockResolvedValue({
        id: 'auto-e2e-1',
        name: 'Welcome flow',
        guildId: 'guild-1',
      }),
    },
    jobRun: {
      findMany: jest.fn().mockResolvedValue([
        { status: 'success', duration: 100 },
        { status: 'success', duration: 200 },
        { status: 'failed', duration: null },
      ]),
      groupBy: jest.fn().mockResolvedValue([{ automationId: 'auto-e2e-1', _count: { id: 3 } }]),
    },
    automationRun: {
      findMany: jest.fn().mockResolvedValue([
        {
          automationId: 'auto-e2e-1',
          status: 'success',
          duration: 80,
          automation: { id: 'auto-e2e-1', name: 'Welcome flow', type: 'scheduled', enabled: true },
        },
        {
          automationId: 'auto-e2e-1',
          status: 'failed',
          duration: 120,
          automation: { id: 'auto-e2e-1', name: 'Welcome flow', type: 'scheduled', enabled: true },
        },
        {
          automationId: 'auto-e2e-1',
          status: 'running',
          duration: null,
          automation: { id: 'auto-e2e-1', name: 'Welcome flow', type: 'scheduled', enabled: true },
        },
      ]),
    },
  } as unknown as PrismaService;
}

async function createApiApp(rbac: RbacService): Promise<{ app: INestApplication; moduleRef: TestingModule }> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
      }),
      ApiModule,
    ],
  })
    .overrideProvider(PrismaService)
    .useValue(createPrismaMockForApiController())
    .overrideProvider(RbacService)
    .useValue(rbac)
    .compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  await app.init();
  return { app, moduleRef };
}

describe('HTTP /api/health + /api/stats + /api/analytics/* (supertest)', () => {
  let app: INestApplication;
  let sessionService: SessionService;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    const rbac = {
      getUserGuilds: jest.fn().mockResolvedValue(['guild-1']),
      hasGuildAccess: jest.fn(async (_userId: string, guildId: string) => guildId === 'guild-1'),
      resolvePermissions: jest.fn(async (_userId: string, guildId?: string) => {
        if (guildId === 'guild-1') {
          return { permissions: new Set(['ANALYTICS_VIEW']) };
        }
        return { permissions: new Set<string>() };
      }),
    } as unknown as RbacService;

    const { app: nestApp, moduleRef } = await createApiApp(rbac);
    app = nestApp;
    sessionService = moduleRef.get(SessionService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /api/health is public', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /api/stats returns 401 without session', async () => {
    await request(app.getHttpServer()).get('/api/stats').set('x-guild-id', 'guild-1').expect(401);
  });

  it('GET /api/stats returns 403 without x-guild-id', async () => {
    await request(app.getHttpServer()).get('/api/stats').set('Authorization', `Bearer ${SESSION_TOKEN}`).expect(403);
  });

  it('GET /api/stats returns aggregates with Bearer + x-guild-id + ANALYTICS_VIEW', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/stats')
      .set('Authorization', `Bearer ${SESSION_TOKEN}`)
      .set('x-guild-id', 'guild-1')
      .expect(200);

    expect(res.body).toEqual({
      users: 10,
      incidents: 5,
      actions: 3,
      pendingIncidents: 2,
    });
  });

  it('GET /api/stats accepts session_token cookie', async () => {
    const code = sessionService.issueOAuthExchangeCode(SESSION_TOKEN);
    const login = await request(app.getHttpServer()).post('/api/auth/oauth-exchange').send({ code }).expect(200);
    const raw = login.headers['set-cookie'] as string[] | undefined;
    const cookieHeader = raw!.map((c) => c.split(';')[0]).join('; ');

    const res = await request(app.getHttpServer()).get('/api/stats').set('Cookie', cookieHeader).set('x-guild-id', 'guild-1').expect(200);

    expect(res.body.users).toBe(10);
  });

  it('GET /api/analytics/rules maps incident groupBy', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/analytics/rules')
      .set('Authorization', `Bearer ${SESSION_TOKEN}`)
      .set('x-guild-id', 'guild-1')
      .expect(200);

    expect(res.body).toEqual([
      { rule: 'anti-spam', count: 8 },
      { rule: 'links', count: 3 },
    ]);
  });

  it('GET /api/analytics/automations returns aggregates', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/analytics/automations')
      .set('Authorization', `Bearer ${SESSION_TOKEN}`)
      .set('x-guild-id', 'guild-1')
      .expect(200);

    expect(res.body.totalAutomations).toBe(9);
    expect(res.body.enabledAutomations).toBe(4);
    expect(res.body.totalRuns).toBe(3);
    expect(res.body.successfulRuns).toBe(2);
    expect(res.body.failedRuns).toBe(1);
    expect(res.body.topAutomations).toEqual([{ name: 'Welcome flow', count: 3 }]);
  });

  it('GET /api/analytics/automations/performance returns overall + per-automation stats', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/analytics/automations/performance')
      .set('Authorization', `Bearer ${SESSION_TOKEN}`)
      .set('x-guild-id', 'guild-1')
      .expect(200);

    expect(res.body.overall.totalRuns).toBe(3);
    expect(res.body.overall.successfulRuns).toBe(1);
    expect(res.body.overall.failedRuns).toBe(1);
    expect(res.body.overall.runningRuns).toBe(1);
    expect(Array.isArray(res.body.automations)).toBe(true);
    expect(res.body.automations.length).toBeGreaterThanOrEqual(1);
    const first = res.body.automations[0];
    expect(first.name).toBe('Welcome flow');
    expect(first.totalRuns).toBe(3);
    expect(first.successfulRuns).toBe(1);
  });
});

describe('HTTP /api/stats PermissionGuard (ANALYTICS_VIEW)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    const rbacNoAnalytics = {
      getUserGuilds: jest.fn().mockResolvedValue(['guild-1']),
      hasGuildAccess: jest.fn(async () => true),
      resolvePermissions: jest.fn(async (_userId: string, guildId?: string) => {
        if (guildId === 'guild-1') {
          return { permissions: new Set(['ACTIONS_VIEW']) };
        }
        return { permissions: new Set<string>() };
      }),
    } as unknown as RbacService;

    const { app: nestApp } = await createApiApp(rbacNoAnalytics);
    app = nestApp;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns 403 when guild is resolved but ANALYTICS_VIEW is missing', async () => {
    await request(app.getHttpServer())
      .get('/api/stats')
      .set('Authorization', `Bearer ${SESSION_TOKEN}`)
      .set('x-guild-id', 'guild-1')
      .expect(403);
  });

  it('returns 403 for /api/analytics/rules without ANALYTICS_VIEW', async () => {
    await request(app.getHttpServer())
      .get('/api/analytics/rules')
      .set('Authorization', `Bearer ${SESSION_TOKEN}`)
      .set('x-guild-id', 'guild-1')
      .expect(403);
  });
});
