# ctrl_frontend

Next.js 15 frontend for the **CTRL Assessment Platform**. Provides the candidate assessment experience, hiring-manager and client portals, admin tooling, and the authentication layer connecting to `ctrl_backend` (Strapi v5).

**Tech stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · NextAuth.js v4 · `@strapi/client` · Firebase (media) · Genkit AI · Stripe (billing)

---

## Project structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/
│   │   ├── assessment/     # Assessment submission endpoints
│   │   ├── auth/           # JSON login/logout/register + NextAuth handler
│   │   ├── strapi-proxy/   # Browser → Strapi BFF (JWT never in client session)
│   │   └── client/         # Client billing, entitlements, upgrades
│   ├── assessment/         # Candidate assessment screens
│   ├── candidate-dashboard/
│   ├── hiring-manager-dashboard/
│   ├── client-dashboard/
│   ├── auth/               # Login / register pages
│   ├── profile/            # Shared profile (PortalMinimalShell)
│   ├── results/            # Post-assessment confirmation (PortalMinimalShell)
│   └── admin/
├── components/
│   └── dashboard/portal/   # Shared portal shell, tokens, UI primitives
├── hooks/                  # React hooks (use-auth, accessibility, etc.)
├── lib/
│   ├── auth/               # NextAuth, credential-auth, strapi-jwt, session-config
│   ├── fetch-client.ts     # Browser → BFF; server → Strapi with server JWT
│   ├── security/           # Rate limits, CSP, origin guard, audit log, lockout
│   └── stripe/             # Checkout + webhook fulfillment
├── services/               # Domain service classes
├── store/                  # Zustand stores
└── middleware.ts           # Route protection (NextAuth withAuth)
```

---

## Auth & roles

Authentication uses **NextAuth.js v4** against Strapi `users-permissions`, with a **JSON login path** as the primary client flow.

| Role | Dashboard | Can do |
|---|---|---|
| `candidate` | `/candidate-dashboard` | Take assessments, view own progress |
| `hiring_manager` | `/hiring-manager-dashboard` | Review campaigns, candidates, reports |
| `client` | `/client-dashboard` | Company entitlements, billing, HM management |
| `admin` | `/admin` | Full admin panel access |

### Session model

- **Browser session** exposes user id, email, name, and role — **not** the Strapi JWT.
- **Server routes** read the Strapi JWT from the encrypted NextAuth token via `getServerStrapiJwt(request)`.
- **Browser → Strapi** calls go through `/api/strapi-proxy/[...path]` with an httpOnly session cookie.

Active login flow:

```ts
// hooks/use-auth.ts → POST /api/auth/login (Accept: application/json)
// Returns { data: { user, redirectPath } } and sets the session cookie.
```

Shared credential validation lives in `lib/auth/credential-auth.ts` (used by both the JSON login route and NextAuth `authorize()`).

---

## Key patterns

### Server-side Strapi access

```ts
import { getServerStrapiJwt } from '@/lib/auth/strapi-jwt';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const strapiJwt = await getServerStrapiJwt(request);

  if (!session?.user?.id || !strapiJwt) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const response = await fetch(`${strapiBaseUrl}/client/entitlements`, {
    headers: { Authorization: `Bearer ${strapiJwt}` },
  });
}
```

### Browser-side Strapi access

```ts
import { fetchClient } from '@/lib/fetch-client';

// Routes through /api/strapi-proxy — allowed paths are whitelisted in the proxy route.
const data = await fetchClient('/support-tickets', { method: 'GET' });
```

### Admin / bootstrap Strapi client

```ts
import { getStrapiClient } from '@/lib/strapi';

// Server-only API token (no user context)
const client = getStrapiClient();
```

`STRAPI_API_URL` is server-side; `NEXT_PUBLIC_STRAPI_API_URL` is the browser-reachable Strapi `/api` base (include `/api` in the value).

### Portal UI

Shared design tokens live in `components/dashboard/portal/portal-design-tokens.ts`. Each role portal uses `PortalShell`; standalone pages (`/profile`, `/results`) use `PortalMinimalShell`.

### Security helpers

```ts
import { rejectCrossOriginRequest } from '@/lib/security/origin-guard';
import { applyRateLimit } from '@/lib/security/api-rate-limit';
import { recordLoginFailure, clearLoginFailures } from '@/lib/security/login-attempt-guard';
```

Production CSP is built in `lib/security/content-security-policy.ts` and applied via `next.config.ts` headers.

### strapi-proxy BFF

Browser-authenticated Strapi calls use `/api/strapi-proxy/[...path]` with a path whitelist, per-IP rate limiting, origin checks on writes, and a 2MB body limit. See `CTRL/System-Security-Integrity.md`.

---

## Environment variables

Copy `.env.example` to `.env.local`. Never commit `.env.local`.

> **`NEXT_PUBLIC_`** exposes a variable to browser bundles. API tokens and secrets must **never** use this prefix.

### NextAuth (Vercel / FrontEnd)

| Variable | Required | Description |
|---|---|---|
| `NEXTAUTH_URL` | ✅ | Canonical app origin (must match browser URL in production) |
| `NEXTAUTH_SECRET` | ✅ | NextAuth cookie signing key (`openssl rand -base64 32`) |
| `UPSTASH_REDIS_REST_URL` | Prod recommended | Shared login lockout, rate limits, audit persistence |
| `UPSTASH_REDIS_REST_TOKEN` | Prod recommended | Pair with `UPSTASH_REDIS_REST_URL` |
| `SESSION_IDLE_MAX_AGE_SECONDS` | Optional | Default 7-day idle timeout |

`JWT_SECRET` and `CSRF_SECRET` are **Strapi-only** (`ctrl_backend` `.env`) — do not set on Vercel.

### Strapi backend

| Variable | Side | Required | Description |
|---|---|---|---|
| `STRAPI_API_URL` | Server only | ✅ | Internal Strapi API base including `/api` |
| `NEXT_PUBLIC_STRAPI_API_URL` | Browser + server | ✅ | Public Strapi API URL reachable from users' browsers |

### Strapi API tokens (server-only)

Generate in **Strapi Admin → Settings → API Tokens**.

| Variable | Description |
|---|---|
| `STRAPI_API_FULL_ACCESS_TOKEN` | Admin/bootstrap operations via `getStrapiClient()` |
| `STRAPI_API_READONLY_TOKEN` | Read-only fallback for assessment content services |

### Stripe (client billing)

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Server-side Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `BILLING_INTERNAL_SECRET` | Shared secret for Strapi internal fulfill endpoint |

### Deployment flags

| Variable | Description |
|---|---|
| `CLOUDFLARE_PAGES` | `"true"` → static export + unoptimized images |

---

## Local development

```bash
npm install
cp .env.example .env.local
# Fill NEXTAUTH_SECRET, Strapi URLs/tokens, optional Upstash

npm run dev          # http://localhost:3000 (Turbopack)
npm run typecheck
npm run lint
```

Ensure `ctrl_backend` is running (see `ctrl_deploy/` or BackEnd README).

---

## Deployment

| Target | Config | Notes |
|---|---|---|
| Cloudflare Pages | `wrangler.toml` | Set `CLOUDFLARE_PAGES=true` — static export, no Node runtime |
| Firebase App Hosting | `apphosting.yaml` | Standalone Next.js container |
| Docker | `Dockerfile` | Standalone output |

### Production checklist

- [ ] `NEXTAUTH_URL` matches the public origin exactly
- [ ] `NEXTAUTH_SECRET` is a strong random value
- [ ] `UPSTASH_REDIS_REST_*` configured for lockout + audit persistence
- [ ] Strapi `JWT_SECRET` + `CSRF_SECRET` on backend only
- [ ] `STRAPI_API_URL` uses internal hostname; `NEXT_PUBLIC_STRAPI_API_URL` is public
- [ ] `STRAPI_API_FULL_ACCESS_TOKEN` from production Strapi instance
- [ ] Stripe keys + `BILLING_INTERNAL_SECRET` aligned between FrontEnd and Strapi
- [ ] `CLOUDFLARE_PAGES` unset unless targeting static export

---

## Related docs

- `CTRL/Auth-Architecture.md` — vault auth architecture
- `CTRL/Known-Gaps.md` — tracked limitations
- `CTRL/Deployment-Env.md` — full env matrix
