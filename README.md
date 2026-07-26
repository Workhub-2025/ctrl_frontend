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

The cutover supports two explicitly selected authentication paths:

- `NEXT_PUBLIC_AUTH_PROVIDER=firebase` signs in with the Firebase browser SDK,
  exchanges the short-lived ID token through
  `POST /api/auth/firebase/session`, and writes an opaque Firebase session plus
  a UI-only NextAuth projection as `httpOnly` cookies.
- The Vercel BFF invokes the private Firebase Function through Vercel OIDC →
  Google Workload Identity Federation. It stores no Google service-account key.
- Newly ported handlers use `requireFirebaseSession()` and never require a
  Strapi JWT. Unported handlers retain the legacy `/api/auth/login` path until
  their domain operation exists in Firebase.
- Pre-provisioned identities receive only the opaque Firebase cookie. They
  complete `/auth/bootstrap` or `/auth/accept-invitation`; the UI session
  projection is created only after `/v1/me` becomes authoritative.
- Firebase TOTP enrollment forces a fresh MFA sign-in before administrator
  bootstrap so the session contains a genuine second-factor claim.
- The generic Strapi proxy remains only because legacy frontend services still
  call it; it must be removed when that dependency count reaches zero.
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
- Firebase public web identifiers plus `NEXT_PUBLIC_AUTH_PROVIDER`
- `FIREBASE_DOMAIN_API_URL`, `GOOGLE_WORKLOAD_IDENTITY_PROVIDER`,
  `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `STRAPI_API_URL`, `STRAPI_API_FULL_ACCESS_TOKEN`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `BILLING_INTERNAL_SECRET`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` in production

Do not expose Strapi tokens, Google credentials or Firebase session-cookie
values through `NEXT_PUBLIC_*`. Firebase web-app identifiers are intentionally
public and are not authorization secrets.

The current application requires a server-capable Next.js deployment. Setting `CLOUDFLARE_PAGES=true` forces static export and is incompatible with the BFF/NextAuth route-handler architecture.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

With `NEXT_PUBLIC_AUTH_PROVIDER=firebase`, the private Function and its Vercel
WIF trust must be deployed. Legacy screens still require Strapi until their BFF
handlers have been ported.

## Verification

```bash
npm run audit:security
npm run check:source-hygiene
npm run check:migration-gate
npm run typecheck
npm test
npm run lint
npm run build
npm run test:e2e
```

`check:migration-gate` is a no-regression ratchet against the current 372
line/rule findings. `check:migration-gate:strict` requires zero and is the
cutover/destruction gate.

Verified result on 2026-07-23:

- Vitest passes: 36 files / 130 tests.
- Typecheck, lint and the production build pass.
- The full production-and-tooling dependency audit reports zero vulnerabilities.
- ESLint 9 runs through the flat-config CLI.
- Playwright now fails an all-skipped run, so missing `E2E_*` configuration
  cannot silently produce a green result. Individual data-dependent tests may
  still skip when their documented seeded resource is unavailable.
- The credentialled candidate smoke runs an axe WCAG scan on assessment
  readiness before any assessed attempt is started.

## Documentation

- `CTRL/01-Platform/Platform-Current-State-2026-07-23.md`
- `CTRL/01-Platform/Repo-Map.md`
- `CTRL/04-Assessments/Assessment-Experience-Redesign-Baseline.md`
- `CTRL/05-Operations/Testing-Quality-Current-State.md`
- `CTRL/05-Operations/Deployment-Env.md`
