# Deployment topology (`apps/server`)

## `PROCESS_TYPE`

| Value | Nest module | HTTP API | Discord bot | Bull queues | Socket.IO `/realtime` |
|-------|-------------|----------|-------------|-------------|------------------------|
| `api` | `ApiModule` (`api-server/api.module.ts`) | Yes | No | Yes (if Redis configured) | Yes |
| `bot` | `BotModule` (`bot-worker/bot.module.ts`) | No | Yes | Yes | No |
| `all` (default) | `AppModule` | Yes | Yes | Yes (via `DiscordModule` → `QueueModule`) | Yes (same as `api` since `AppModule` parity update) |

**Production recommendation:** run **`api`** and **`bot`** as **separate processes** (two containers or two systemd units) with **Redis** and **PostgreSQL** shared. Avoid `all` in production unless you accept coupled failure domains and a single scaling unit.

## Environment essentials

- **`DATABASE_URL`**: PostgreSQL (required).
- **`DISCORD_BOT_TOKEN`**: required when `PROCESS_TYPE` is `bot` or `all`.
- **`REDIS_URL`** or **`REDIS_HOST`**: required for Bull processors when queues are used.
- **`SESSION_SECRET`**: required when `NODE_ENV=production`.
- **`WEB_URL`**: browser origin for OAuth redirects (see `auth.controller.ts`).
- **`CORS_ORIGINS`**: allowed browser origins in production (comma-separated).

## Same-site auth (web + API)

For cookie-based sessions, the dashboard origin must be allowed by CORS and consistent with `WEB_URL` for OAuth redirects. Cross-port localhost dev is supported via explicit `CORS_ORIGINS` (see `apps/server/.env.example`).

### Session cookie behavior

- **`session_token`**: HTTP-only cookie set after login or `POST /api/auth/oauth-exchange`. The browser sends it automatically on same-site requests when `withCredentials` is enabled (see `apps/web/lib/api.ts`).
- **`Secure` flag**: Enabled in production (or when `COOKIE_SECURE=true`). Local HTTP dev typically uses non-secure cookies unless you force secure.
- **`SameSite`**: Relies on Nest/Express defaults; for cross-subdomain deployments (e.g. `app.example.com` + `api.example.com`), you may need a shared parent domain and explicit cookie `domain` work—treat that as an infra follow-up, not implied by the current code.
- **Bearer token**: `Authorization: Bearer <session token>` is supported for API clients; the dashboard primarily uses cookies.

### Ports (local defaults from repo conventions)

| Surface | Typical port | Env / notes |
|---------|----------------|-------------|
| Next.js dashboard | `7634` | `apps/web` dev; align `WEB_URL` / `NEXT_PUBLIC_API_URL` |
| Nest HTTP API | `9691` | `API_PORT` in `apps/server` |

## OAuth browser callback

Discord redirects to **`DISCORD_REDIRECT_URI`** (must point at this API, e.g. `https://api.example.com/api/auth/discord/callback`). The API then redirects the browser to **`WEB_URL/auth/callback`** with a **short-lived `code`**; the SPA exchanges it via **`POST /api/auth/oauth-exchange`** (no session token in the query string). **Horizontally scaled API** deployments should replace the in-memory exchange map with Redis (same interface pattern).
