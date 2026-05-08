# Full technical audit: `apps/server` & `apps/web`

**Date:** 2026-05-08  
**Scope:** Second pass, codebase as source of truth (no assumed CI/Docker behavior).  
**Repository slice:** NestJS API/bot (`apps/server`), Next.js dashboard (`apps/web`).

---

## Executive summary

The project is a **large monorepo** combining a **NestJS + Prisma + PostgreSQL** backend (Discord bot, REST API, optional Bull queues, Socket.IO) with a **Next.js 16** dashboard. The **data model and module surface area suggest an enterprise moderation platform**; **implementation quality is uneven**: several **security-sensitive defects** exist in auth and realtime code, **RBAC/permission wiring was partially broken** for routes without `GuildGuard`, the **web UI mixes real API calls with hard-coded mock data**, and **two parallel App Router trees** create confusion and unauthenticated demo pages. Automated tests are **sparse** relative to scope. Overall maturity: **internal alpha / prototype**, not production-hardened without substantial remediation.

---

## 1. Process model & bootstrap (`apps/server`)

### What exists

- `main.ts`: env validation; `PROCESS_TYPE` of `api` → HTTP `ApiModule`; `bot` → `BotModule` application context (no HTTP); default `all` → `AppModule`.
- Global `JSON.stringify` monkey-patch for `BigInt` serialization.
- Swagger at `/api/docs` when HTTP server starts.

### Findings

- **`all` vs `api` divergence:** `ApiModule` (`api-server`) includes `WebsocketModule`, `HealthModule`, `SetupModule`, explicit `QueueModule`; `AppModule` does not include websocket/health/setup the same way. Operators can ship the wrong topology by accident.
- **Global `JSON.stringify` patch** affects every library in-process; surprising for observability and third-party code.

### Verdict

**Refactor** process documentation and dev/prod matrices; consider removing `JSON.stringify` global patch in favor of a response interceptor or serializer.

---

## 2. Configuration & environment

### Files

- `apps/server/src/config/env.validation.ts`
- `apps/server/.env.example`

### Findings

- **Required:** `DATABASE_URL`; `DISCORD_BOT_TOKEN` if `PROCESS_TYPE` is `bot` or `all`.
- **Production:** exits if `SESSION_SECRET` missing when `NODE_ENV=production`.
- **Redis:** warned optional though queues need it.
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

- Register/login, session cookie, Discord code exchange (`POST /api/auth/discord`), `exchange-token`, `session` / `me`, logout.
- Session from `session_token` cookie or `Authorization: Bearer`.

### Critical issues (addressed in code where noted)

1. **Hardcoded frontend URLs** in `GET /api/auth/discord/callback` pointed to a LAN IP (`192.168.100.200:7634`) — breaks every other deployment.
2. **Session cookie `secure: false` always** — unacceptable for HTTPS production.
3. **OAuth success redirect** placed **session token and full `user` JSON in query string** — leaks credentials and PII to logs, history, Referer; reduced in fix by dropping `user` from query (token still a known limitation for cross-origin dev until same-site deployment).

### Verdict

**Refactor** auth until production uses HTTPS-only cookies and no long-lived secrets in URLs (one-time codes or same-origin callback).

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

- **`vm2`** executes tenant-controlled logic. **`vm2` is unmaintained** and has a poor security track record — **not production-acceptable** for arbitrary user/guild code in the API process.
- Auto-mod and detectors include **explicit placeholders** (e.g. toxicity/NSFW stubs, spam detector placeholder return).

### Verdict

**Remove or replace** `vm2` with a safe DSL or out-of-process worker; treat ML-related auto-mod paths as **non-production** until real integrations exist.

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

- Jest configured; **very few** specs under `apps/server/test/` relative to thousands of lines of application code.

### Verdict

**Critical gap** for auth, RBAC, and guild-scoped APIs.

---

## 11. Next.js web (`apps/web`)

### Stack

- Next 16, React 19, TanStack Query, Axios, Radix UI, Tailwind 4, shared packages `@supremo/shared-types`, `@supremo/rules-engine`, `@supremo/utils`.

### API integration

- `lib/api.ts`: `NEXT_PUBLIC_API_URL` default `http://localhost:9691`, `withCredentials`, `x-guild-id` from `localStorage`.
- `lib/hooks/use-api.ts`: extensive hooks.

### Mock / demo data

- `lib/mock-data.ts` drives **stats-cards, activity-chart, ban-list, automod-panel, moderators-panel, recent-actions, channel-activity**, etc.
- **`app/dashboard/automation/page.tsx`:** real `useAutomations` plus **hard-coded** stats/workflow rows.
- **`app/(dashboard)/*`:** parallel routes like `/users`, `/analytics` with **no `AuthGuard`** in that layout; **`(dashboard)/users/page.tsx`** uses **inline mock users**.

### Routing / UX debt

- **`app/dashboard/*`:** primary product path (sidebar links here); includes `AuthGuard` + guild setup in `app/dashboard/layout.tsx`.
- **`app/(dashboard)/*`:** duplicate shell, wrong auth posture, mock-heavy — **technical debt or abandoned spike**.

### Verdict

**Remove or merge** `(dashboard)` tree; replace mock-driven widgets with API-backed data or dev-only flags.

---

## 12. Cross-cutting security summary

| Issue | Severity | Status in repo after this pass |
|-------|----------|--------------------------------|
| Hardcoded OAuth redirect host | High | **Fixed** (`WEB_URL` / default) |
| Cookie not secure in production | High | **Fixed** (`NODE_ENV` / `COOKIE_SECURE`) |
| Token + user in OAuth redirect query | High | **Partially fixed** (user JSON removed; token still documented risk) |
| WS `subscribe_guild` without ACL | High | **Fixed** |
| `vm2` user code | Critical | **Documented** — not removed in this pass |
| Duplicate unauthenticated dashboard routes | Medium | **Documented** — not removed in this pass |
| `PermissionGuard` without guild | High | **Fixed** |
| Debug `ADMIN` vs seeded keys | Medium | **Fixed** → `SYSTEM_ADMIN` |
| Missing `GuildGuard` on analytics routes | High | **Fixed** |

---

## 13. Recommendations (priority)

1. **Security:** Remove `vm2` user execution path; add E2E tests for OAuth, cookies, and guild ACLs.
2. **Web:** Delete `app/(dashboard)` or merge behind same `AuthGuard`; remove `mock-data` from production bundles.
3. **Ops:** Standardize on `PROCESS_TYPE=api` + `bot` + Redis + Postgres; document ports and cookie domains for same-site auth.
4. **Quality:** Add Jest/supertest (or e2e) for permission matrix and critical controllers.

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
| Automation / workflows | Partial; unsafe execution primitive |
| Auto-mod / ML claims | Partial / placeholder detectors |
| Next dashboard | Partial; mixed mock and real data |

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

Not addressed in this pass: removing `vm2`, deleting `app/(dashboard)` duplicate tree, replacing dashboard mock data.

---

*End of report.*
