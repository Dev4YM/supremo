import { createHash } from 'crypto';
import { Controller, Get, INestApplication, Module, Req, UseGuards } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { Request } from 'express';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';
import { SessionGuard } from '../src/auth/guards/session.guard';
import { GuildGuard } from '../src/auth/guards/guild.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { RbacService } from '../src/auth/rbac.service';
import { SessionService } from '../src/auth/session.service';

const SESSION_TOKEN = 'e2e-session-token-value-used-only-in-tests';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function createPrismaMock() {
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
  } as unknown as PrismaService;
}

function createRbacMock() {
  return {
    getUserGuilds: jest.fn().mockResolvedValue(['guild-1']),
    hasGuildAccess: jest.fn(async (_userId: string, guildId: string) => guildId === 'guild-1'),
    resolvePermissions: jest.fn(async (_userId: string, guildId?: string) => {
      if (guildId === 'guild-1') {
        return { permissions: new Set(['ACTIONS_VIEW']) };
      }
      return { permissions: new Set<string>() };
    }),
  } as unknown as RbacService;
}

type GuildRequest = Request & { guildId?: string; permissions?: Set<string> };

@Controller('api/e2e')
class E2eGuildHttpController {
  @Get('guild-context')
  @UseGuards(SessionGuard, GuildGuard)
  guildContext(@Req() req: GuildRequest) {
    return {
      guildId: req.guildId,
      permissions: req.permissions ? [...req.permissions] : [],
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
    }),
    AuthModule,
  ],
  controllers: [E2eGuildHttpController],
})
class HttpAuthGuildE2eModule {}

describe('HTTP auth + guild context (supertest)', () => {
  let app: INestApplication;
  let sessionService: SessionService;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    const prismaMock = createPrismaMock();
    const rbacMock = createRbacMock();

    const moduleRef = await Test.createTestingModule({
      imports: [HttpAuthGuildE2eModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(RbacService)
      .useValue(rbacMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    sessionService = moduleRef.get(SessionService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('POST /api/auth/oauth-exchange sets session cookie and returns user', async () => {
    const code = sessionService.issueOAuthExchangeCode(SESSION_TOKEN);

    const res = await request(app.getHttpServer())
      .post('/api/auth/oauth-exchange')
      .send({ code })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.id).toBe('user-e2e');
    expect(res.body.data.user.username).toBe('e2e-user');

    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(String(setCookie)).toContain('session_token=');
  });

  it('GET /api/auth/me accepts session_token cookie', async () => {
    const code = sessionService.issueOAuthExchangeCode(SESSION_TOKEN);
    const login = await request(app.getHttpServer()).post('/api/auth/oauth-exchange').send({ code }).expect(200);

    const raw = login.headers['set-cookie'] as string[] | undefined;
    expect(raw?.length).toBeGreaterThan(0);
    const cookieHeader = raw!.map((c) => c.split(';')[0]).join('; ');

    const me = await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', cookieHeader).expect(200);

    expect(me.body.id).toBe('user-e2e');
    expect(me.body.guilds).toEqual(['guild-1']);
  });

  it('GET /api/auth/me accepts Authorization: Bearer session token', async () => {
    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${SESSION_TOKEN}`)
      .expect(200);

    expect(me.body.username).toBe('e2e-user');
  });

  it('GET /api/e2e/guild-context returns 403 without x-guild-id', async () => {
    await request(app.getHttpServer())
      .get('/api/e2e/guild-context')
      .set('Authorization', `Bearer ${SESSION_TOKEN}`)
      .expect(403);
  });

  it('GET /api/e2e/guild-context resolves guild and permissions with x-guild-id', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/e2e/guild-context')
      .set('Authorization', `Bearer ${SESSION_TOKEN}`)
      .set('x-guild-id', 'guild-1')
      .expect(200);

    expect(res.body.guildId).toBe('guild-1');
    expect(res.body.permissions).toContain('ACTIONS_VIEW');
  });

  it('GET /api/e2e/guild-context returns 403 when user lacks guild access', async () => {
    await request(app.getHttpServer())
      .get('/api/e2e/guild-context')
      .set('Authorization', `Bearer ${SESSION_TOKEN}`)
      .set('x-guild-id', 'guild-other')
      .expect(403);
  });

  it('POST /api/auth/oauth-exchange returns 400 for invalid code', async () => {
    await request(app.getHttpServer()).post('/api/auth/oauth-exchange').send({ code: 'deadbeef' }).expect(400);
  });
});
