# Full technical audit: `apps/server` & `apps/web`

**Date:** 2026-05-08  
**Scope:** Second pass, codebase as source of truth (no assumed CI/Docker behavior).  
**Repository slice:** NestJS API/bot (`apps/server`), Next.js dashboard (`apps/web`).

---

## Executive summary

The project is a **large monorepo** combining a **NestJS + Prisma + PostgreSQL** backend (Discord bot, REST API, optional Bull queues, Socket.IO) with a **Next.js 16** dashboard. The **data model and module surface area suggest an enterprise moderation platform**; **implementation quality is uneven** but a **remediation pass** addressed the highest-risk auth/RBAC/realtime issues, **removed `vm2`**, **aligned `AppModule` HTTP surface** closer to `ApiModule`, **replaced the global `JSON.stringify` BigInt patch** with an interceptor, and **rewired primary dashboard widgets** to guild-scoped APIs instead of `mock-data`. Automated tests remain **limited** relative to scope (unit tests for OAuth exchange codes and `PermissionGuard`; **HTTP supertest** for auth/guild probes, **`GET /api/health`**, **`GET /api/stats`**, **`GET /api/analytics/*`**, **`GET/POST /api/incidents`** (including resolve/approve/reject), **`GET` / `POST /api/actions`**, with cookie/Bearer, `x-guild-id`, and permission matrices — all with mocked `PrismaService` / `RbacService`, no real database). Overall maturity: **internal alpha**, closer to a maintainable internal pilot than before, still not production-hardened without full DB-backed E2E and further automation hardening.

---

## 1. Process model & bootstrap (`apps/server`)

### What exists

- `main.ts`: env validation; `PROCESS_TYPE` of `api` → HTTP `ApiModule`; `bot` → `BotModule` application context (no HTTP); default `all` → `AppModule`.
- **`BigIntSerializationInterceptor`** (global) for API JSON responses instead of monkey-patching `JSON.stringify`.
- Swagger at `/api/docs` when HTTP server starts.

### Findings

- **`all` vs `api` divergence:** `ApiModule` (`api-server`) still carries some wiring differences (e.g. queue layout); **`AppModule` now also imports** `WebsocketModule`, `HealthModule`, and `SetupModule` to reduce accidental drift when running `PROCESS_TYPE=all`.
- ~~**Global `JSON.stringify` patch**~~ **Addressed:** response interceptor serializes BigInt safely without mutating global JSON.

### Verdict

**Done / ongoing:** topology documented in `docs/DEPLOYMENT-TOPOLOGY.md`; prefer explicit `api` vs `bot` processes in production. BigInt handled via interceptor.

---

## 2. Configuration & environment

### Files

- `apps/server/src/config/env.validation.ts`
- `apps/server/.env.example`

### Findings

- **Required:** `DATABASE_URL`; `DISCORD_BOT_TOKEN` if `PROCESS_TYPE` is `bot` or `all`.
- **Production:** exits if `SESSION_SECRET` missing when `NODE_ENV=production`.
- **Redis:** warned optional though queues need it; when **`PROCESS_TYPE`** is **`api`** or **`all`** and neither **`REDIS_HOST`** nor **`REDIS_URL`** is set, startup logs an extra warning that Bull queues cannot process jobs until Redis is configured.
- **`.env.example`** lists `WEB_URL` (previously underused in auth redirects in code paths that still had hardcoded IPs).

### Verdict

**Keep** validation; align all features with documented env vars (done in implementation pass for OAuth redirects).

---

## 3. Authentication & sessions

### Files

- `apps/server/src/auth/auth.controller.ts`
- `apps/server/src/auth/guards/session.guard.ts`
- `apps/server/src/auth/session.service.ts` (referenced)
- Prisma: `BotUser`, `AuthSession`, `OAuthAccount`

### What works

- Register/login, session cookie, Discord code exchange (`POST /api/auth/discord`), `exchange-token`, **`oauth-exchange`** (preferred after browser redirect), `session` / `me`, logout.
- Session from `session_token` cookie or `Authorization: Bearer`.

### Critical issues (addressed in code where noted)

1. **Hardcoded frontend URLs** in `GET /api/auth/discord/callback` pointed to a LAN IP (`192.168.100.200:7634`) — breaks every other deployment.
2. **Session cookie `secure: false` always** — unacceptable for HTTPS production.
3. **OAuth success redirect** originally placed **session token and full `user` JSON in query string** — leaks credentials and PII. **Fixed:** `user` JSON removed early; **superseded** by **short-lived one-time `code`** + `POST /api/auth/oauth-exchange` (browser never sees raw session token in the happy path). Legacy `?token=` still supported for older clients.

### Verdict

**Production path:** HTTPS-only cookies (`NODE_ENV` / `COOKIE_SECURE`) + **one-time OAuth exchange codes**; keep phasing out `exchange-token` from URLs entirely when all clients are updated.

---

## 4. RBAC & HTTP guards

### Files

- `apps/server/src/auth/guards/guild.guard.ts`
- `apps/server/src/auth/guards/permission.guard.ts`
- `apps/server/src/auth/rbac.service.ts`
- `apps/server/prisma/seed-rbac.ts`

### Findings

- **`GuildGuard`** resolves `x-guild-id` / `guildId`, checks access, sets `request.guildId` and `request.permissions`.
- **`PermissionGuard`** originally read **only** `request.permissions` set by `GuildGuard`.
- **Bug:** Any route using `SessionGuard` + `PermissionGuard` **without** `GuildGuard` left `request.permissions` **undefined**, so **every permission check failed with 403** (including `/api/debug/*`).
- **Secondary bug:** `DebugController` used `@RequirePermission('ADMIN')` but seeded permission keys use **`SYSTEM_ADMIN`**, not `ADMIN` — even a correct guard would deny everyone.

### Verdict

**Fixed in implementation:** `PermissionGuard` resolves global permissions when `request.permissions === undefined`; debug uses `SYSTEM_ADMIN`.

---

## 5. REST API & `ApiController`

### Files

- `apps/server/src/api/api.controller.ts`
- Domain controllers under `apps/server/src/*/*.controller.ts`

### Findings

- `/api/stats`, `/api/analytics/rules` correctly use `SessionGuard`, `GuildGuard`, `PermissionGuard`.
- **`/api/analytics/automations` and `/api/analytics/automations/performance`** used `SessionGuard` + `PermissionGuard` **without** `GuildGuard`: `@CurrentGuild()` was **undefined**, so Prisma filters used `guildId: undefined` (wrong or empty results) and permission set was broken before guard fix.

### Verdict

**Fixed:** `GuildGuard` added to both routes.

### Follow-up (same audit cycle)

- **`GET /api/analytics/automations/performance`:** `AutomationRun.status` is stored **lowercase** (`success` / `failed` / `running`, see `workflow-engine.service.ts`). The controller previously compared **uppercase** strings, so success/failed/running counts were wrong. **Fixed:** comparisons aligned to stored values.

---

## 6. WebSocket realtime

### Files

- `apps/server/src/api-server/websocket/realtime.gateway.ts`
- `apps/server/src/api-server/websocket/websocket.module.ts`

### Findings

- Namespace `/realtime`; session validated on connect.
- **`subscribe_guild`:** joined `guild:${guildId}` **without verifying** the user may access that guild → **IDOR** if events carry sensitive payloads.
- **`apps/web`:** no Socket.IO client in application source (only transitive deps) — feature unused from dashboard.

### Verdict

**Fixed:** guild subscription checks `RbacService.hasGuildAccess`. **Refactor or remove** until the web app consumes it safely.

---

## 7. Queues (Bull / Redis)

### Files

- `apps/server/src/shared/queue/queue.module.ts`

### Findings

- Queues: `actions`, `incidents`, `ml-analysis`; Redis from env.
- `DiscordModule` and `BotModule` import `QueueModule`; API server stack includes it.

### Verdict

**Keep**; treat Redis as required when workers are enabled.

---

## 8. Automation & sandboxing

### Files

- `apps/server/src/automation/**`
- `apps/server/src/automation/actions/utility/custom-code.action.ts`
- `apps/server/src/automation/actions/utility/condition.action.ts`

### Findings

- **`vm2` removed:** `custom-code` / `condition` automation actions **fail closed** with an explicit message instead of executing tenant code in-process.
- Auto-mod and detectors still include **explicit placeholders** (e.g. toxicity/NSFW stubs); spam logic was improved but ML-related paths remain **non-production** until real integrations exist.

### Verdict

**Next:** introduce a **safe DSL or out-of-process worker** if tenant-defined logic is required again; treat ML-related auto-mod paths as **non-production** until real integrations exist.

---

## 9. Prisma schema

### File

- `apps/server/prisma/schema.prisma` (very large)

### Findings

- Broad multi-tenant model (guilds, RBAC, incidents, automations, anti-raid, auto-mod, cases, trust, tickets, analytics, …).
- **Breadth ≠ depth:** not every model has a complete, tested service layer.

### Verdict

**Keep** schema direction; **prune or gate** unused surfaces until backed by tests and UX.

---

## 10. Testing

### Findings

- Jest configured; coverage remains thin relative to scope. **Unit tests** under `apps/server/src/**` cover **OAuth exchange codes** (`SessionService`) and **`PermissionGuard`**. **HTTP integration tests** under `apps/server/test/**` (supertest) exercise **`POST /api/auth/oauth-exchange`**, **`GET /api/auth/me`** (cookie + Bearer), **`GET /api/health`**, **`GET /api/stats`** (guild header, `ANALYTICS_VIEW` vs 403), **`GET /api/analytics/rules`**, **`GET /api/analytics/automations`**, **`GET /api/analytics/automations/performance`** (mocked `incident.groupBy`, `automation` / `jobRun` / `automationRun`), **`GET /api/analytics/rules`** 403 without `ANALYTICS_VIEW`, **`GET/POST /api/incidents`**, **`PUT /api/incidents/:id`**, **`POST .../approve`** and **`POST .../reject`** (with `INCIDENTS_RESOLVE`), **`GET /api/actions`**, **`POST /api/actions`** (`note` execute with **`ACTIONS_EXECUTE`**), 403 when **`ACTIONS_EXECUTE`** is missing, and **`x-guild-id`** with `SessionGuard` + `GuildGuard` using mocked `PrismaService` / `RbacService` (no real database). Incidents/actions e2e use **`IncidentsModule`** plus a slim **`ActionsHttpSliceModule`** (real `ActionsController` + `ActionsService`, stub `DiscordService`; execute tests override with a guild/member **Discord** stub) so the full **`ApiModule`** graph (Discord login, Bull) is not bootstrapped in Jest.

### Verdict

**Critical gap** remains for DB-backed E2E and supertest coverage of the rest of the HTTP surface (warn/timeout execute paths, remaining domain controllers); continue expanding tests for auth, RBAC, and guild-scoped APIs.

---

## 11. Next.js web (`apps/web`)

### Stack

- Next 16, React 19, TanStack Query, Axios, Radix UI, Tailwind 4, shared packages `@supremo/shared-types`, `@supremo/rules-engine`, `@supremo/utils`.

### API integration

- `lib/api.ts`: `NEXT_PUBLIC_API_URL` default `http://localhost:9691`, `withCredentials`, `x-guild-id` from `localStorage`.
- `lib/hooks/use-api.ts`: extensive hooks.

### Mock / demo data

- **`lib/mock-data.ts`** was **removed**; primary dashboard widgets use TanStack Query + guild APIs.
- **`app/dashboard/logs/page.tsx`:** moderation log list uses **`useGuildModerationActions`** (guild `GET /api/actions`) instead of removed **`lib/mock-data`**.

### Routing / UX debt

- **`app/dashboard/*`:** primary product path (sidebar links here); includes `AuthGuard` + guild setup in `app/dashboard/layout.tsx`.
- **`app/(dashboard)/*` duplicate tree:** **removed** in this remediation cycle.

### Verdict

**Done for core widgets:** duplicate route tree removed; mock-driven dashboard components replaced with API-backed data. **`lib/mock-data.ts` removed** (no remaining imports).

---

## 12. Cross-cutting security summary

| Issue | Severity | Status in repo after this pass |
|-------|----------|--------------------------------|
| Hardcoded OAuth redirect host | High | **Fixed** (`WEB_URL` / default) |
| Cookie not secure in production | High | **Fixed** (`NODE_ENV` / `COOKIE_SECURE`) |
| Token + user in OAuth redirect query | High | **Fixed** (one-time `code` + `POST /api/auth/oauth-exchange`; legacy `token` still supported) |
| WS `subscribe_guild` without ACL | High | **Fixed** |
| `vm2` user code | Critical | **Fixed** — dependency removed; custom-code / condition actions fail closed with explicit message |
| Duplicate unauthenticated dashboard routes | Medium | **Fixed** — `app/(dashboard)` removed; primary path is `app/dashboard/*` |
| `PermissionGuard` without guild | High | **Fixed** |
| Debug `ADMIN` vs seeded keys | Medium | **Fixed** → `SYSTEM_ADMIN` |
| Missing `GuildGuard` on analytics routes | High | **Fixed** |
| Automation performance counted wrong `AutomationRun.status` casing vs DB | Medium | **Fixed** (lowercase `success` / `failed` / `running`) |

---

## 13. Recommendations (priority)

1. **Security:** ~~Remove `vm2`~~ (done); expand E2E / supertest (partial: auth, guild, health, stats, **`/api/analytics/*`**, incidents CRUD + resolve, **`GET`/`POST /api/actions`**); add **DB-backed** E2E for OAuth and guild ACLs when CI has Postgres.
2. **Web:** ~~Delete `app/(dashboard)`~~ (done); ~~remove mock-driven dashboard widgets~~ (done); ~~delete `lib/mock-data.ts`~~ (done).
3. **Ops:** Standardize on `PROCESS_TYPE=api` + `bot` + Redis + Postgres; document ports and cookie domains for same-site auth.
4. **Quality:** ~~Add Jest/supertest~~ (partial: auth + guild + health + stats + **`/api/analytics/*`** + incidents + **`GET`/`POST /api/actions`**); continue with warn/timeout execute paths, cases/tickets, and remaining domain controllers.

---

## 14. Feature inventory (condensed)

| Area | State |
|------|--------|
| Nest HTTP API + Swagger | Mostly working |
| Discord bot worker | Partial (large surface) |
| Prisma / PostgreSQL | Schema production-scale; usage varies |
| Bull queues | Partial (Redis-dependent) |
| Socket.IO realtime | Prototype; web unused |
| RBAC | Mostly working after guard fixes |
| Automation / workflows | Partial; in-process custom code path removed (`vm2`); use safe DSL or worker for tenant logic |
| Auto-mod / ML claims | Partial / placeholder detectors |
| Next dashboard | Primary widgets use guild APIs; `lib/mock-data.ts` removed |

---

---

## 15. Implementation log (2026-05-08)

The following changes were applied in the same session as this report:

| Change | Files |
|--------|--------|
| OAuth GET callback redirects use `WEB_URL` / `FRONTEND_URL` / `NEXT_PUBLIC_APP_URL`, default `http://localhost:7634` | `auth.controller.ts` |
| Session cookie `secure` respects production or `COOKIE_SECURE`; `clearCookie` matches | `auth.controller.ts` |
| Removed `user` JSON from OAuth redirect query (token only; profile from `exchange-token`) | `auth.controller.ts` |
| `PermissionGuard` resolves global RBAC when `request.permissions` is unset (no `GuildGuard`) | `permission.guard.ts` |
| `GuildGuard` added to `/api/analytics/automations` and `.../performance` | `api.controller.ts` |
| Debug API requires `SYSTEM_ADMIN` instead of non-seeded `ADMIN` | `debug.controller.ts` |
| WebSocket `subscribe_guild` / `unsubscribe_guild` check `hasGuildAccess` | `realtime.gateway.ts` |
| Env validation warns if `WEB_URL`/`FRONTEND_URL` missing; documents `COOKIE_SECURE` | `env.validation.ts` |
| `.env.example` aligned with web port 7634 and CORS for local dev | `.env.example` |

**Follow-up implementation (same audit cycle):**

| Change | Files |
|--------|--------|
| Global `JSON.stringify` BigInt patch replaced with `BigIntSerializationInterceptor` | `main.ts`, `common/interceptors/bigint-serialization.interceptor.ts` |
| `AppModule` imports `HealthModule`, `SetupModule`, `WebsocketModule` for closer parity with API topology | `app.module.ts` |
| PROCESS_TYPE / ports / OAuth notes | `docs/DEPLOYMENT-TOPOLOGY.md` |
| OAuth redirect uses one-time `code`; `POST /api/auth/oauth-exchange`; web callback + `authAPI.oauthExchange` | `session.service.ts`, `auth.controller.ts`, `apps/web/app/auth/callback/page.tsx`, `apps/web/lib/api.ts` |
| Removed `vm2`; custom-code / condition actions fail closed | `apps/server/package.json`, `automation/actions/utility/custom-code.action.ts`, `condition.action.ts` |
| Spam detector repeated-message logic | `bot-worker/intelligence/detectors/spam.detector.ts` |
| Auto-mod `GET` rules returns all rules; `scanMessage` skips disabled rules | `auto-mod.service.ts` |
| Dashboard widgets use real hooks (`useGuildModerationActions`, engagement, auto-mod, Discord members/channels) | `apps/web/components/dashboard/*.tsx`, `apps/web/app/dashboard/moderators/page.tsx` |
| `actionsAPI.getActions(params)`; `useGuildModerationActions`; automation list query key `actionDefinitions` | `apps/web/lib/api.ts`, `apps/web/lib/hooks/use-api.ts` |
| Jest: OAuth exchange map + `PermissionGuard` matrix | `session.service.spec.ts`, `permission.guard.spec.ts` |
| Supertest: OAuth cookie, Bearer, `x-guild-id` + `GuildGuard` | `test/auth-guild.http.e2e-spec.ts`, `test/jest-http-e2e.json`, `package.json` `test:e2e` |
| Supertest: `GET /api/health`, `GET /api/stats`, `/api/analytics/*` + `ANALYTICS_VIEW` / 403; Prisma mock extended for `automation`, `jobRun`, `automationRun` | `test/api-stats.http.e2e-spec.ts` |
| `getAutomationPerformance` uses lowercase `AutomationRun.status` values matching `workflow-engine.service.ts` | `api.controller.ts` |
| Env: extra Redis warning when `PROCESS_TYPE` is `api` or `all` and Redis unset | `env.validation.ts` |
| Supertest: incidents (list, id, create, `PUT`, approve, reject), actions (`GET`, `POST` `note` execute, 403 without `ACTIONS_EXECUTE`); `ActionsHttpSliceModule` + optional Discord override | `test/incidents-actions.http.e2e-spec.ts` |
| Actions: `getActions` filters by `targetUserId` or legacy `userId`; execute supports **kick** / **ban** via Discord.js | `actions.service.ts` |
| Cases: normalized **status/type/severity** filters for `findAll`; **create** accepts **`subjectDiscordId`** (+ optional username) with find-or-create `User` | `cases.service.ts` |
| Cases dashboard: API-aligned status badges/stats; create flow picks **Discord member** (`USERS_VIEW`) and sends `subjectDiscordId` | `app/dashboard/cases/page.tsx` |
| Logs dashboard: **`useGuildModerationActions`** instead of mock data | `app/dashboard/logs/page.tsx` |
| Deployment: session cookie / ports subsection | `docs/DEPLOYMENT-TOPOLOGY.md` |
| Removed unused `apps/web/lib/mock-data.ts` | (deleted) |

---

*End of report.*
