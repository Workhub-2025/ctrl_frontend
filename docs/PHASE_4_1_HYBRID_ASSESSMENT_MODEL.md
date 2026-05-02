# Phase 4.1 - Hybrid Assessment Domain Alignment

This phase introduces a unified evidence-led assessment model while preserving all existing assessment flows.

## What was added

- A shared domain schema for hybrid assessment outcomes and competency evidence:
  - `src/types/hybrid-assessment.types.ts`
- A model layer that converts each assessment type into comparable evidence and produces a weighted hybrid summary:
  - `src/lib/assessment/hybrid-assessment-model.ts`
- A session-based orchestration helper for temporary cross-assessment aggregation:
  - `src/lib/assessment/hybrid-assessment-session.ts`

## Competency framework (v1)

- `decision_consistency`
- `pressure_performance`
- `signal_over_noise`
- `communication_clarity`
- `operational_accuracy`

## Alignment behavior implemented

- Typing assessment now emits standardized evidence (speed + accuracy signals).
- Call simulation now emits standardized evidence based on incident-log completeness.
- Situational judgement now emits standardized evidence based on MCQ/text completion coverage.
- Results page now reads the aggregated hybrid summary and displays:
  - overall readiness score
  - readiness band

## Non-breaking intent

- Existing routes, auth, and assessment UI flow remain unchanged.
- Hybrid scoring in this phase is a domain-alignment layer (foundational), not final psychometric calibration.

## Next recommended step (Phase 4.2)

- Move from completion-based heuristics to rubric-linked scoring per question/call field.
- Persist hybrid evidence server-side for recruiter/client dashboards and defensibility reporting.
