# Call simulation audio (Path A)

MP3s are served by the **FrontEnd** app at `/assets/call-simulation/*` — not Strapi Media Library.

## Required files

| File | Used by |
|---|---|
| `call-0-practice-burglary-residential-v3.mp3` | Practice Call (same audio as Call 2) |
| `call-1-active-car-break-in.mp3` | Call 1 (final) |
| `call-2-burglary-residential-v3.mp3` | Call 2 (final) |

Copy your mastered files here with these exact names (rename from spaces if needed).

Paths are referenced in `BackEnd/.../assessment-content/call-simulation.json`.

## ESP / scoring criteria

Stored in repo at:

`BackEnd/ctrl_backend/src/api/assessment/services/generated-assessment-content.ts`

Edit ESP there, or add a `criteria` object per run in `call-simulation.json`, then run platform sync.

## Deploy

- **Vercel / static host:** MP3s deploy with the FrontEnd build (consider Git LFS if files are large).
- **Self-hosted:** ensure this folder is included in the FrontEnd static root.

## Optional: Strapi Media Library

If upload is fixed on your home server, you can use `/uploads/...` in `audioSrc` instead — session init resolves both.
