# Phase 4.2 - Rubric Linked Scoring + Persistence

> **⚠️ Deprecated (2026-06-20):** The hybrid summary API, `hybrid-assessment.service.ts`, and related types were **removed**. Typing progress now persists via `POST /api/assessment/attempt/progress` → Strapi `candidate-assessment-attempt`. See `CTRL/05-Operations/API-Contract-Map.md`.

This phase moves hybrid assessment from local-only heuristic aggregation to rubric-linked scoring and backend persistence hooks.

## What changed

- Rubric-driven scoring bands were added for:
  - typing speed and typing accuracy
  - call simulation incident-log completeness
  - situational judgement MCQ/text completion coverage
- These rubric bands now feed competency evidence generation in:
  - `src/lib/assessment/hybrid-assessment-model.ts`

## Persistence behavior

- New API endpoint:
  - `POST /api/assessment/hybrid-summary`
  - file: `src/app/api/assessment/hybrid-summary/route.ts`
- Endpoint behavior:
  - validates payload with `HybridAssessmentSummarySchema`
  - rate-limits requests
  - updates user core fields in Strapi (`overallScore`, `progresStatus`)
  - optionally sends full summary to `HYBRID_ASSESSMENT_WEBHOOK_URL`
  - emits structured observability logs with correlation IDs

## Client integration

- New service:
  - `src/services/hybrid-assessment.service.ts`
- Results page now:
  - reads aggregated hybrid summary
  - persists once per session when all 3 assessment outcomes are present
  - tracks persisted state in session storage
  - surfaces save status to user

## Scope note

This phase preserves existing UI flow and route structure.
It prepares Phase 4.3 where recruiter/client decision surfaces can consume persisted hybrid evidence directly.
