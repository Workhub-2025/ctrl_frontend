# ctrl_frontend

Next.js 15 frontend for the **CTRL Assessment Platform** — candidate assessments, hiring-manager and client portals, admin tooling, and the BFF layer to `ctrl_backend` (Strapi v5).

**Branch tip:** `afaf508` on `codex/ctrl-mihir-dev`  
**Tech stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · NextAuth.js v4 · Stripe · Vitest · Playwright

Vault docs: `CTRL/01-Platform/Project-Brain-Frontend.md` · `CTRL/05-Operations/API-Contract-Map.md`

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── assessment/[slug]/submit/   # Unified submit for all registered slugs
│   │   ├── assessment/attempt/         # Progress, heartbeat, recovery
│   │   ├── auth/                       # JSON login/logout/register + NextAuth
│   │   ├── strapi-proxy/               # Browser → Strapi BFF (JWT server-side only)
│   │   ├── client/                     # Client portal BFF (entitlements, notes, billing)
│   │   ├── hiring-manager/             # HM portal BFF (sessions, reports, notes)
│   │   ├── candidate/                  # Candidate workspace + join
│   │   └── admin/                      # Admin billing, comms, seat management
│   ├── assessment/[slug]/              # Dynamic assessment UI (5 registered slugs)
│   ├── candidate-dashboard/
│   ├── hiring-manager-dashboard/
│   ├── client-dashboard/
│   └── admin/
├── assessments/plugins/                # Plugin registry, submit handlers, report breakdowns
├── components/dashboard/               # Portal shells + role-specific views
├── lib/                                # Auth, security, fetch-client, Stripe, entitlements
├── services/                           # BFF bridge services (no direct browser Strapi JWT)
└── middleware.ts                       # Route protection
```

---

## Auth & roles

Primary login: `hooks/use-auth.ts` → `POST /api/auth/login` with `Accept: application/json` (not NextAuth `signIn()`).

| Role | Dashboard |
|---|---|
| `candidate` | `/candidate-dashboard` |
| `hiring_manager` | `/hiring-manager-dashboard` |
| `client` | `/client-dashboard` |
| `admin` | `/admin` |

- Strapi JWT lives in the httpOnly NextAuth token — **never** exposed to browser JS.
- Browser Strapi calls → `fetchClient()` → `/api/strapi-proxy` (allowlist: `support-tickets`, `candidate-sessions`, `users-permissions`).
- Assessment progress → BFF `/api/assessment/attempt/progress` (not strapi-proxy).
- Server routes → `getServerStrapiJwt(request)` from the session cookie.

See `CTRL/02-Security/Auth-Architecture.md`.

---

## Key BFF patterns

### Server-side Strapi

```ts
import { getServerStrapiJwt } from '@/lib/auth/strapi-jwt';

const strapiJwt = await getServerStrapiJwt(request);
const response = await fetch(`${strapiBaseUrl}/client/entitlements`, {
  headers: { Authorization: `Bearer ${strapiJwt}` },
});
```

### Browser-side Strapi (allowlisted paths only)

```ts
import { fetchClient } from '@/lib/fetch-client';

const data = await fetchClient('/support-tickets', { method: 'GET' });
```

### Assessment submit & progress

| Flow | BFF route | Strapi |
|---|---|---|
| Submit any slug | `POST /api/assessment/[slug]/submit` | `POST /assessment/:slug/results` |
| Typing auto-save | `POST /api/assessment/attempt/progress` | `POST /candidate-assessment-attempts/progress` |
| Candidate portal | `GET /api/candidate/workspace` | `GET /candidate/workspace` |

### Shared-candidate notes (client + HM)

| Action | BFF |
|---|---|
| List/create | `GET/POST /api/{client\|hiring-manager}/shared-candidates/[id]/notes` |
| Delete | `DELETE /api/{client\|hiring-manager}/notes/[noteId]` |

UI: `components/dashboard/shared-candidate-notes-panel.tsx`

---

## Environment variables

Copy `.env.example` to `.env.local`. Never commit secrets.

| Variable | Required | Notes |
|---|---|---|
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | ✅ | Session cookie signing |
| `STRAPI_API_URL` | ✅ | Server-side Strapi base (include `/api`) |
| `STRAPI_API_FULL_ACCESS_TOKEN` | ✅ | Server bootstrap / admin BFF |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | ✅ | Billing |
| `BILLING_INTERNAL_SECRET` | ✅ | Must match Strapi |
| `UPSTASH_REDIS_REST_*` | Prod | Distributed rate limits + lockout |

`JWT_SECRET` and `CSRF_SECRET` are **Strapi-only** — do not set on Vercel.

Full matrix: `CTRL/05-Operations/Deployment-Env.md`

---

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3000
npm run typecheck
npm test             # vitest (35 tests)
npm run lint
```

Ensure `ctrl_backend` is running. See `BackEnd/ctrl_backend/README.md`.

### E2E (optional)

```bash
npm run test:e2e     # portal-smoke + api-contract specs
```

Requires `E2E_BASE_URL` and role credentials — see `CTRL/05-Operations/Deployment-Env.md#E2E`.

---

## Deployment

| Target | Notes |
|---|---|
| **Vercel** | Primary production target (Node runtime, BFF routes) |
| Docker | `Dockerfile` — standalone Next.js output |
| Firebase App Hosting | `apphosting.yaml` |

Production checklist:

- [ ] `NEXTAUTH_URL` matches public origin exactly
- [ ] `STRAPI_API_URL` reachable from Vercel (public URL, not LAN)
- [ ] `BILLING_INTERNAL_SECRET` matches Strapi
- [ ] `UPSTASH_REDIS_REST_*` configured
- [ ] Stripe webhook + keys aligned

---

## Removed legacy (2026-06-20)

Do not reintroduce without vault review:

- Slug-specific submit aliases (`/api/assessment/typing/submit`, etc.)
- Legacy Strapi collection services (`company`, `question`, `audio-call`, `hybrid-assessment`, `assessment-progress`)
- `assessment-progress` in strapi-proxy allowlist
- Hybrid assessment summary route (`/api/assessment/hybrid-summary`)

---

## Related docs

| Doc | Path |
|---|---|
| Vault frontend brain | `CTRL/01-Platform/Project-Brain-Frontend.md` |
| API contract map | `CTRL/05-Operations/API-Contract-Map.md` |
| Auth architecture | `CTRL/02-Security/Auth-Architecture.md` |
| Assessment plugins | `CTRL/05-Operations/Assessment-Plugin-Migration-Plan.md` |
| Deprecated hybrid phase docs | `docs/PHASE_4_1_*`, `docs/PHASE_4_2_*` (historical) |
