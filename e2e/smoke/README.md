# Anonymous smoke suite

Checks, with no credentials, that:

- the public pages render (`/`, `/pricing`, the legal pages, `/auth/login`, `/join`);
- each portal root (`/admin`, `/client-dashboard`, `/hiring-manager-dashboard`, `/candidate-dashboard`) redirects an anonymous visitor to `/auth/login?callbackUrl=…`;
- none of those pages log console errors, throw page errors or get a 5xx response.

## Against a running deployment (strict)

```bash
PLAYWRIGHT_BASE_URL=https://<staging-host> npm run test:smoke
```

## Locally, without any real credentials

The production build refuses to start without Firebase, backend and Upstash config, so use the placeholders in `placeholder.env`. Build with them too, because `NEXT_PUBLIC_*` values are baked in at build time. Run this from a shell with no `.env.local` secrets you don't want loaded:

```bash
source e2e/smoke/placeholder.env && npx next build && npx next start -p 3100
```

```bash
SMOKE_ALLOW_BACKEND_ERRORS=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 npm run test:smoke
```

`SMOKE_ALLOW_BACKEND_ERRORS=1` tolerates 5xx only from `/api/public/*`, the BFF routes that proxy the backend. `/` and `/pricing` call `/api/public/contract-options`, which fails when the backend is a placeholder.

With `PLAYWRIGHT_BASE_URL` unset, the config starts `npm run dev` on port 3000 itself. That doesn't work inside a `.claude/worktrees/*` checkout, because Turbopack picks the parent folder's lockfile as the workspace root and `next/font` fails to resolve.

Test files are named `*.smoke.ts` because `*.spec.ts` is gitignored across the repo.
