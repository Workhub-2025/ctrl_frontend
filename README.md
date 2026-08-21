# CTRL FrontEnd

Next.js 15 application and BFF for the CTRL Assessment Platform: public/legal pages, authentication, four role portals, Stripe coordination and the v2 candidate assessment experience.

**Audited base:** `e7070c0` on `codex/ctrl-mihir-dev` (2026-07-23)
**Important:** the current worktree contains untracked parallel/legacy assessment prototypes. Canonical typechecking excludes those explicit drafts without deleting them, and CI rejects tracked duplicate-suffixed source files.

## Stack

Next.js App Router · React 18 · TypeScript · Tailwind CSS · Radix/shadcn · NextAuth v4 · Zustand · Stripe · Vitest · Playwright

## Current architecture

```text
src/
├── app/
│   ├── api/                         # Browser-facing BFF
│   ├── assessment/[slug]/           # Canonical v2 candidate route
│   ├── candidate-dashboard/
│   ├── hiring-manager-dashboard/
│   ├── client-dashboard/
│   └── admin/
├── assessment-modules/              # Active v2 renderers and generated registry
├── assessments/plugins/             # Display/report compatibility metadata
├── components/dashboard/            # Shared portal shell + role UI
├── lib/                              # Auth, runtime client, billing, security, domain helpers
├── services/                         # BFF/domain adapters
├── store/                            # Zustand stores
└── middleware.ts                     # API/page guards, role routing, mutation security
```

## Roles

| Role | Primary route |
|---|---|
| Candidate | `/candidate-dashboard` |
| Hiring manager | `/hiring-manager-dashboard` |
| Client | `/client-dashboard` |
| Admin/scoped admin | `/admin` |

## Authentication

Firebase is the only supported authentication path. Product data is Cloud SQL
behind the private domain API:

- The Firebase browser SDK signs users in,
  exchanges the short-lived ID token through
  `POST /api/auth/firebase/session`, and writes an opaque Firebase session plus
  a UI-only NextAuth projection as `httpOnly` cookies.
- The Vercel BFF invokes the private domain API through Vercel OIDC →
  Google Workload Identity Federation. It stores no Google service-account key.
- Active handlers use `requireFirebaseSession()`.
- Pre-provisioned identities receive only the opaque Firebase cookie. They
  complete `/auth/bootstrap` or `/auth/accept-invitation`; the UI session
  projection is created only after `/v1/me` becomes authoritative.
- Firebase TOTP enrollment forces a fresh MFA sign-in before administrator
  bootstrap so the session contains a genuine second-factor claim.
- There is no CMS proxy, health, or debug login route. The migration gate
  fails if those paths are reintroduced.
- Default session lifetime is 12 hours absolute and 30 minutes idle.
- Middleware guards role portals and BFF namespaces, rejects cross-origin mutations, applies a payload ceiling/rate limit and adds the production CSP nonce.

## Active assessment runtime

The candidate path is:

`/assessment/[slug]` → `src/assessment-modules/registry.generated.ts` → module readiness/live renderer → `/api/assessment-runtime/*`.

Runtime operations:

| Operation | BFF |
|---|---|
| Readiness | `GET /api/assessment-runtime/readiness` |
| Start | `POST /api/assessment-runtime/start` |
| Status | `GET /api/assessment-runtime/attempts/:id/status` |
| Heartbeat | `POST /api/assessment-runtime/attempts/:id/heartbeat` |
| Progress | `PATCH /api/assessment-runtime/attempts/:id/progress` |
| Integrity event | `POST /api/assessment-runtime/attempts/:id/events` |
| Submit | `POST /api/assessment-runtime/attempts/:id/submit` |
| Restart | `POST /api/assessment-runtime/attempts/:id/restart` |
| Media | `GET /api/assessment-runtime/media/:mediaId` |

Five v2 renderers are registered: Call Simulation, Prioritisation, Short-Term Memory, Situational Judgement and Typing.

The old `/api/assessment/[slug]/submit` and `/api/assessment/attempt/progress` handlers do not exist in the tracked runtime. Do not build new work on untracked alternate files under `src/components/assessment/*`.

## Environment

Copy `.env.example` to `.env.local`. Key server-only variables include:

- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- Firebase public web identifiers
- `DOMAIN_API_URL` (with `FIREBASE_DOMAIN_API_URL` accepted during cutover), `GOOGLE_WORKLOAD_IDENTITY_PROVIDER`,
  `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `BILLING_INTERNAL_SECRET`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` in production

Do not expose Google credentials or Firebase session-cookie values through
`NEXT_PUBLIC_*`. Firebase web-app identifiers are intentionally public and are
not authorization secrets. Retired CMS variables must not be configured.

The current application requires a server-capable Next.js deployment. Setting `CLOUDFLARE_PAGES=true` forces static export and is incompatible with the BFF/NextAuth route-handler architecture.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The private Function and its Vercel WIF trust must be deployed. Local browser
traffic uses same-origin `/api/*` BFF routes; the retired CMS is not required.

## Verification

```bash
npm run audit:security
npm run check:source-hygiene
npm run check:migration-gate
npm run typecheck
npm test
npm run lint
npm run build
```

`check:migration-gate` fails if any retired CMS proxy route, host, or import
is reintroduced. `check:migration-gate:strict` is the same zero-reference gate.

Verified result on 2026-07-23:

- Vitest passes: 36 files / 130 tests.
- Typecheck, lint and the production build pass.
- The full production-and-tooling dependency audit reports zero vulnerabilities.
- ESLint 9 runs through the flat-config CLI.

## Documentation

- `CTRL/01-Platform/Platform-Current-State-2026-07-23.md`
- `CTRL/01-Platform/Repo-Map.md`
- `CTRL/04-Assessments/Assessment-Experience-Redesign-Baseline.md`
- `CTRL/05-Operations/Testing-Quality-Current-State.md`
- `CTRL/05-Operations/Deployment-Env.md`
