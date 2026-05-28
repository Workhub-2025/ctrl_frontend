# Prioritisation Assessment Scoring — Backend Implementation Summary

**Date:** May 25, 2026  
**Scope:** `ctrl_backend` (Strapi). Covers content types, scoring logic, endpoints, and submission flow for the Prioritisation Assessment.

---

## Content Types

### `Assessment` (`api::assessment.assessment`)

The definition of an assessment type. Identified by a `slug`, recommended as:

```md
prioritisation
```

The assessment record should carry a config component for prioritisation-specific defaults.

### `assessment-config/prioritisation` (component)

Global defaults for the Prioritisation Assessment:

| Attribute | Type | Default |
|---|---|---|
| `scenarioCount` | integer | 10-15 |
| `statementsPerScenario` | integer | 5 |
| `passThreshold` | decimal | TBD |
| `randomiseScenarioOrder` | boolean | false |
| `randomiseStatementOrder` | boolean | true |
| `showResultsToCandidate` | boolean | false |

### `PrioritisationScenario` (`api::prioritisation-scenario.prioritisation-scenario`)

Stores each scenario and its five rankable statements.

| Attribute | Type | Notes |
|---|---|---|
| `scenarioText` | rich text / text | The workplace scenario shown to the candidate |
| `instructions` | text | Optional scenario-specific guidance |
| `statements` | component / json | Five statements to rank |
| `competency` | enum / string | e.g. prioritisation, risk awareness, escalation, operational judgement |
| `difficulty` | enum | `easy \| medium \| hard` |
| `isActive` | boolean | Controls whether scenario can be assigned |

Each scenario must have exactly **five statements**.

### `PrioritisationStatement` (component)

Each statement must include:

| Attribute | Type | Notes |
|---|---|---|
| `statementId` | string | Stable ID for the statement |
| `text` | text | Candidate-facing statement text |
| `idealRank` | integer | 1-5, where 1 is highest priority |
| `riskLevel` | enum / string | Optional: `high \| medium \| low` |
| `rationale` | text | Optional explanation for HM/Admin review |

The backend must store the ideal ranking server-side. The frontend should never submit or depend on the correct order.

### `AssessmentResult` (`api::assessment-result.assessment-result`)

Persists the candidate's scored prioritisation output.

| Attribute | Type | Notes |
|---|---|---|
| `assessment` | relation -> Assessment | links to the prioritisation definition |
| `users_permissions_user` | relation -> User | always set server-side, never from body |
| `assessmentStatus` | enum | `pending \| in-progress \| completed \| expired` |
| `rawScore` | decimal | total points earned |
| `maxScore` | decimal | total points available |
| `score` | decimal | percentage score |
| `passed` | boolean | `score >= passThreshold` |
| `ratingBand` | string | `Excellent \| Strong \| Moderate \| Limited \| Weak` |
| `rawData` | json | submitted rankings and scenario data |
| `metrics` | json | computed breakdown stored for dashboards |
| `durationSeconds` | integer | derived from `completedAt - startedAt` |
| `attemptNumber` | integer | incremented per previous result for the same user + type |

---

## Scoring Logic (`prioritisation-scoring.ts`)

Single source of truth for all prioritisation scoring.

Each scenario contains five statements. The candidate ranks each statement:

```md
1 = highest priority
5 = lowest priority
```

The backend compares each candidate rank against the stored `idealRank`.

### Statement Score

Recommended scoring per statement:

| Rank Difference | Meaning | Points |
|---:|---|---:|
| 0 | Exact match | 4 |
| 1 | One position away | 3 |
| 2 | Two positions away | 2 |
| 3 | Three positions away | 1 |
| 4 | Completely reversed | 0 |

Formula:

```md
rankDifference = abs(candidateRank - idealRank)
statementScore = max(4 - rankDifference, 0)
```

### Scenario Score

Each scenario has five statements.

```md
scenarioRawScore = sum(statementScore)
scenarioMaxScore = 5 statements * 4 points = 20
scenarioPercentage = (scenarioRawScore / scenarioMaxScore) * 100
```

### Overall Score

```md
rawScore = sum(scenarioRawScore)
maxScore = totalScenarios * 20
overallScore = (rawScore / maxScore) * 100
```

This rewards exact ranking, but still gives partial credit for answers that are close to the ideal order.

---

## Rating Band

| Overall Score | Band |
|---|---|
| >= 90 | Excellent |
| >= 75 | Strong |
| >= 60 | Moderate |
| >= 45 | Limited |
| < 45 | Weak |

### Pass Logic

```md
passed = overallScore >= passThreshold
```

The pass threshold should be resolved from config at submit time.

Recommended threshold fallback chain:

```md
CandidateAssessmentSettings.prioritisationPassThreshold
  -> Campaign.prioritisationConfig.passThreshold
    -> Assessment config component passThreshold
      -> PRIORITISATION_PASS_THRESHOLD constant
```

---

## Candidate Submission Format

The frontend should submit the candidate's final ranking only. Scores and ideal ranks must not be trusted from the client.

```json
{
  "startedAt": "2026-05-25T10:00:00Z",
  "completedAt": "2026-05-25T10:15:00Z",
  "rawData": {
    "responses": [
      {
        "scenarioId": "PRI-001",
        "rankings": [
          {
            "statementId": "PRI-001-S1",
            "rank": 1
          },
          {
            "statementId": "PRI-001-S2",
            "rank": 4
          },
          {
            "statementId": "PRI-001-S3",
            "rank": 2
          },
          {
            "statementId": "PRI-001-S4",
            "rank": 5
          },
          {
            "statementId": "PRI-001-S5",
            "rank": 3
          }
        ]
      }
    ]
  }
}
```

Backend should:

1. Load each scenario by ID.
2. Validate that each submitted statement belongs to that scenario.
3. Validate each scenario has one rank per statement.
4. Validate ranks are unique and contain `1, 2, 3, 4, 5`.
5. Read each statement's `idealRank` server-side.
6. Calculate statement scores, scenario scores, overall score, pass/fail, and rating band.
7. Persist the result.

---

## Example Calculation

One scenario has five statements:

| Statement | Ideal Rank | Candidate Rank | Difference | Points |
|---|---:|---:|---:|---:|
| S1 | 1 | 1 | 0 | 4 |
| S2 | 2 | 4 | 2 | 2 |
| S3 | 3 | 2 | 1 | 3 |
| S4 | 4 | 5 | 1 | 3 |
| S5 | 5 | 3 | 2 | 2 |

```md
scenarioRawScore = 14
scenarioMaxScore = 20
scenarioPercentage = 70%
```

For a 10-scenario assessment:

```md
maxScore = 10 scenarios * 20 = 200
rawScore = 152
overallScore = 76%
ratingBand = Strong
```

---

## Metrics To Store

The `metrics` JSON should include:

| Metric | Description |
|---|---|
| `exactMatchCount` | Number of statements ranked exactly correctly |
| `oneAwayCount` | Number of statements one position away |
| `twoAwayCount` | Number of statements two positions away |
| `threeAwayCount` | Number of statements three positions away |
| `reversedCount` | Number of statements four positions away |
| `rawScore` | Total points earned |
| `maxScore` | Total points available |
| `percentageScore` | Final score as percentage |
| `ratingBand` | Performance band |
| `scenarioBreakdown` | Score per scenario |
| `competencyBreakdown` | Score grouped by competency |
| `durationSeconds` | Time taken for audit/analytics only, not used as a time limit |

Example metrics:

```json
{
  "exactMatchCount": 22,
  "oneAwayCount": 16,
  "twoAwayCount": 8,
  "threeAwayCount": 3,
  "reversedCount": 1,
  "rawScore": 152,
  "maxScore": 200,
  "percentageScore": 76,
  "ratingBand": "Strong",
  "scenarioBreakdown": [
    {
      "scenarioId": "PRI-001",
      "rawScore": 14,
      "maxScore": 20,
      "percentageScore": 70
    }
  ],
  "competencyBreakdown": {
    "riskAwareness": {
      "rawScore": 42,
      "maxScore": 50,
      "percentageScore": 84
    },
    "escalation": {
      "rawScore": 36,
      "maxScore": 50,
      "percentageScore": 72
    }
  },
  "durationSeconds": 900
}
```

---

## Endpoints

Recommended endpoint shape:

| Method | Path | Actor | Description |
|---|---|---|---|
| `GET` | `/api/assessment/prioritisation` | Candidate | Fetch prioritisation definition + config |
| `POST` | `/api/assessment/prioritisation/session` | Candidate | Initialise session and receive assigned scenarios |
| `POST` | `/api/assessment/prioritisation/results` | Candidate | Submit rankings for backend scoring |
| `GET` | `/api/assessment/prioritisation/results/mine` | Candidate | Own result history, without final score if candidate results are hidden |
| `GET` | `/api/assessment/prioritisation/results` | Hiring Manager / Admin | All prioritisation results, paginated |
| `GET` | `/api/assessment/prioritisation/results/stats` | Hiring Manager / Admin | Aggregated prioritisation statistics |

Client visibility should be handled through shared candidate/report access, not by allowing unrestricted result access.

---

## Submission Flow

Endpoint:

```md
POST /api/assessment/prioritisation/results
```

Body:

```json
{
  "startedAt": "2026-05-25T10:00:00Z",
  "completedAt": "2026-05-25T10:15:00Z",
  "rawData": {
    "responses": [
      {
        "scenarioId": "PRI-001",
        "rankings": [
          {
            "statementId": "PRI-001-S1",
            "rank": 1
          }
        ]
      }
    ]
  }
}
```

Backend flow:

1. Authenticate via `ctx.state.user`.
2. Look up `Assessment` by slug `prioritisation`.
3. Validate assessment is active.
4. Validate required fields: `startedAt`, `completedAt`, `rawData.responses[]`.
5. Run idempotency check: reject with `409 Conflict` if a completed prioritisation result already exists for this user + assessment type.
6. Load all submitted scenarios and statements server-side.
7. Validate each submitted statement belongs to the submitted scenario.
8. Validate ranking completeness and uniqueness.
9. Score each statement using server-side ideal ranks.
10. Compute:
   - `rawScore`
   - `maxScore`
   - `score`
   - `passed`
   - `ratingBand`
   - `metrics`
   - `durationSeconds`
   - `attemptNumber`
11. Persist `AssessmentResult`.
12. Return a candidate-safe response.

Candidate response should not include score:

```json
{
  "data": {
    "documentId": "result-document-id",
    "submitted": true,
    "completedAt": "2026-05-25T10:15:00Z"
  }
}
```

Hiring Manager / Client result views can include:

```json
{
  "data": {
    "documentId": "result-document-id",
    "score": 76,
    "passed": true,
    "ratingBand": "Strong",
    "metrics": {}
  }
}
```

---

## Security Properties

| Property | Implementation |
|---|---|
| Ownership enforcement | `users_permissions_user` is always set from `ctx.state.user`, never from the request body |
| Score integrity | Ideal ranks are read server-side; client-supplied scores or ideal order must be ignored |
| Statement validation | Submitted statements must belong to the submitted scenario |
| Ranking validation | Each scenario must include five unique ranks: `1, 2, 3, 4, 5` |
| Idempotency | A candidate cannot submit a second completed prioritisation result for the same assessment type |
| Result visibility | Prioritisation scores are not returned to the Candidate; visible to Hiring Manager and Client only |
| Auditability | Store submitted scenario IDs, statement IDs, ranks, ideal rank differences, and computed metrics |

---

## File Reference

Recommended backend files:

| File | Role |
|---|---|
| `src/api/assessment/services/prioritisation-scoring.ts` | Scoring constants, rank-difference scoring, `scorePrioritisationResponses` |
| `src/api/assessment/services/result-scorer.ts` | Strategy dispatcher routes prioritisation `rawData` to the prioritisation scorer |
| `src/api/assessment/services/assessment.ts` | `submitResults`, `getMyResults`, `getAllResults`, `getStats`, `sessionInit` |
| `src/api/assessment/controllers/assessment.ts` | HTTP handlers for custom prioritisation routes |
| `src/api/assessment/routes/01-custom-routes-assessment.ts` | Route definitions for prioritisation endpoints |
| `src/api/assessment-result/content-types/assessment-result/schema.json` | `AssessmentResult` schema |
| `src/api/prioritisation-scenario/content-types/prioritisation-scenario/schema.json` | Prioritisation scenario schema |
| `src/components/assessment-config/prioritisation.json` | Global prioritisation config component |
| `src/components/campaign-config/prioritisation.json` | Per-campaign prioritisation config component |

---

## Open Backend Decisions

| Decision | Recommendation |
|---|---|
| Pass threshold | Define with product team after sample scenario set is finalised |
| Scenario count | 10-15 scenarios for MVP |
| Candidate result visibility | Candidate should see completion only, not final score |
| Statement order | Randomise statement order, but preserve server-side ideal ranks |
| Scenario order | Optional; can stay fixed for MVP if consistency is preferred |
| Scoring method | Use rank-difference partial credit for MVP |
| Reversed rankings | Expose `reversedCount` clearly in HM/Client reports |
