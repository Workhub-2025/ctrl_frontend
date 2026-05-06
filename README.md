# ctrl_frontend

Next.js 15 frontend for the **WorkHub Assessment Platform**. Provides the candidate-facing assessment experience, the hiring-manager review dashboard, and the authentication layer connecting to `ctrl_backend` (Strapi v5).

**Tech stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · NextAuth.js v4 · `@strapi/client` · Firebase (media) · Genkit AI

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/
│   │   ├── assessment/     # Assessment submission endpoints (typing, hybrid, integrity)
│   │   ├── auth/           # NextAuth [...nextauth] handler
│   │   ├── bff/            # Backend-for-frontend helpers
│   │   └── user/           # User profile endpoints
│   ├── assessment/         # Candidate assessment screens (typing, audio-call, hybrid)
│   ├── candidate-dashboard/
│   ├── hiring-manager-dashboard/
│   ├── auth/               # Login / register pages
│   └── admin/              # Admin-only views
├── components/             # Shared UI components (shadcn/ui + custom)
├── hooks/                  # React hooks
├── lib/
│   ├── strapi.ts           # @strapi/client singleton + getStrapiClient()
│   ├── fetch-client.ts     # Fetch wrapper with CSRF + auth headers
│   ├── auth/               # NextAuth config, role model, session helpers
│   ├── observability/      # Server-action tracing utilities
│   └── security/           # Rate limiting helpers
├── services/               # Domain service classes (assessment, audio-call, etc.)
├── store/                  # Zustand stores
├── types/                  # Shared TypeScript types
└── middleware.ts           # Route protection (NextAuth withAuth)
```

---

## 🔐 Auth & Roles

Authentication is handled by **NextAuth.js v4** against the Strapi `users-permissions` plugin.

| Role | Dashboard | Can do |
|---|---|---|
| `candidate` | `/candidate-dashboard` | Take assessments, view own progress |
| `hiring_manager` | `/hiring-manager-dashboard` | Review candidate results and reports |
| `client` | `/client-dashboard` | View company-level reports |
| `admin` | `/admin` | Full admin panel access |

The NextAuth session exposes `session.user.jwt` (the Strapi-issued JWT). All authenticated Strapi requests pass this token via `getStrapiClient(session.user.jwt)`.

---

## 🎯 Key Patterns

### Strapi client

```ts
import { getStrapiClient } from '@/lib/strapi';

// Server component / API route — authenticated as current user
const client = getStrapiClient(session.user.jwt);

// Server component — authenticated as API token (admin/public ops)
const client = getStrapiClient();
```

`STRAPI_API_URL` is used server-side; `NEXT_PUBLIC_STRAPI_API_URL` is used client-side. Both must resolve to the Strapi `/api` endpoint (include `/api` in the value).

### fetch-client

Low-level fetch wrapper used by services. Automatically:
- Attaches `Authorization: Bearer <jwt>` from the NextAuth session
- Attaches `x-ctrl-tenant` header
- Fetches and attaches the CSRF token for mutating requests

### Rate limiting

```ts
import { applyRateLimit } from '@/lib/security';
await applyRateLimit({ key: `typing:${userId}`, limit: 5, windowMs: 30_000 });
```

### Observability

```ts
import { startServerActionTrace } from '@/lib/observability';
const trace = startServerActionTrace('submit-typing', { correlationId });
// ...
trace.success();
```

---

## 🌍 Environment Variables

Copy `.env.example` to `.env.local` and fill in the values. Never commit `.env.local`.

> **`NEXT_PUBLIC_` prefix** makes a variable available in browser bundles. API tokens and secrets must **never** use this prefix.

### Server runtime

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `development` or `production` |
| `PORT` | `3000` | Dev server port (`npm run dev -- -p 3000`) |
| `HOSTNAME` | `0.0.0.0` | Dev server bind address |

### NextAuth

| Variable | Required | Description |
|---|---|---|
| `NEXTAUTH_URL` | ✅ | Canonical origin of this app (e.g. `http://localhost:3000`). Must match the browser URL exactly in production. |
| `NEXTAUTH_SECRET` | ✅ | Signing key for NextAuth JWTs and cookies. Generate with `openssl rand -base64 32`. |
| `JWT_SECRET` | ✅ | Must match `JWT_SECRET` in `ctrl_backend` `.env`. Used to verify Strapi-issued user JWTs inside the NextAuth callback. |

### Strapi backend

| Variable | Side | Required | Description |
|---|---|---|---|
| `STRAPI_API_URL` | Server only | ✅ | Base URL of the Strapi API for SSR and API routes. Include `/api` (e.g. `http://127.0.0.1:1337/api`). In Docker use `http://strapi:1337/api`. |
| `NEXT_PUBLIC_STRAPI_API_URL` | Browser + Server | ✅ | Public-facing Strapi API URL for client components. Must be reachable from the user's browser. |

### Strapi API tokens

Both tokens are **server-only** — never use `NEXT_PUBLIC_` variants. Generate them in **Strapi Admin → Settings → API Tokens**.

| Variable | Token type | Description |
|---|---|---|
| `STRAPI_API_FULL_ACCESS_TOKEN` | Full access | Used by `getStrapiClient()` (no JWT arg) for admin operations and bootstrap reads. |
| `STRAPI_API_READONLY_TOKEN` | Read-only | Reserved for public/low-privilege endpoints. Not currently wired to a specific client instance — available for future use. |

### Deployment flags

| Variable | Description |
|---|---|
| `CLOUDFLARE_PAGES` | Set to `"true"` for Cloudflare Pages deployment. Switches `next.config.ts` to `output: 'export'` and disables Next.js image optimisation. |

---

## 🚀 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local — fill in NEXTAUTH_SECRET, JWT_SECRET, and the Strapi token

# 3. Make sure ctrl_backend is running
#    (see ctrl_deploy/ for docker-compose)

# 4. Start the dev server (Turbopack)
npm run dev
```

The app runs on `http://localhost:3000`.

```bash
# Type-check without building
npm run typecheck

# Lint
npm run lint
```

### AI flows (Genkit)

```bash
# Start Genkit developer UI alongside the app
npm run genkit:dev
```

---

## 🏭 Deployment

| Target | Config file | Notes |
|---|---|---|
| Cloudflare Pages | `wrangler.toml` | Set `CLOUDFLARE_PAGES=true`. Static export — no Node.js runtime. |
| Firebase App Hosting | `apphosting.yaml` | Containerised Next.js (standalone output). |
| Docker / any container | `Dockerfile` | Standalone output. Set all env vars in your platform dashboard. |

### Production checklist

- [ ] `NEXTAUTH_URL` set to the exact public origin
- [ ] `NEXTAUTH_SECRET` is a strong random value
- [ ] `JWT_SECRET` matches `ctrl_backend` exactly
- [ ] `STRAPI_API_URL` uses an internal / private hostname (not exposed to browsers)
- [ ] `NEXT_PUBLIC_STRAPI_API_URL` is the public Strapi URL
- [ ] `STRAPI_API_FULL_ACCESS_TOKEN` is a full-access token from the production Strapi instance
- [ ] `CLOUDFLARE_PAGES` unset (or `false`) unless targeting Cloudflare Pages static export
