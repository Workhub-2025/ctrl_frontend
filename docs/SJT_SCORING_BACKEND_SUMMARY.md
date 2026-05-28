# Situational Judgement Test Scoring — Backend Implementation Summary

**Date:** May 25, 2026  
**Scope:** `ctrl_backend` (Strapi). Covers content types, scoring logic, endpoints, and submission flow for the Situational Judgement Test.

---

## Content Types

### `Assessment` (`api::assessment.assessment`)

The definition of an assessment type. Identified by a `slug`, recommended as:

```md
situational-judgement
```

The assessment record should carry a config component for SJT-specific defaults.

### `assessment-config/situational-judgement` (component)

Global defaults for the Situational Judgement Test:

| Attribute | Type | Default |
|---|---|---|
| `questionCount` | integer | 15-20 |
| `timeLimitSeconds` | integer | TBD |
| `passThreshold` | decimal | TBD |
| `randomiseQuestionOrder` | boolean | false |
| `randomiseOptionOrder` | boolean | true |
| `showResultsToCandidate` | boolean | false |

### `SJTQuestion` (`api::sjt-question.sjt-question`)

Stores each scenario/question and the four possible responses.

| Attribute | Type | Notes |
|---|---|---|
| `scenarioText` | rich text / text | The workplace scenario shown to the candidate |
| `questionText` | text | The question prompt |
| `options` | component / json | Four answer options |
| `competency` | enum / string | e.g. judgement, empathy, risk awareness, communication |
| `difficulty` | enum | `easy \| medium \| hard` |
| `isActive` | boolean | Controls whether question can be assigned |

Each question must have exactly **four answer options**.

### `SJTOption` (component)

Each option must include:

| Attribute | Type | Notes |
|---|---|---|
| `label` | string | A, B, C, D |
| `text` | text | Candidate-facing answer text |
| `classification` | enum | `Best \| Good \| Weak \| Unsafe` |
| `score` | integer | `5 \| 3 \| 1 \| 0` |

Classification score mapping:

| Classification | Score |
|---|---:|
| Best | 5 |
| Good | 3 |
| Weak | 1 |
| Unsafe | 0 |

### `AssessmentResult` (`api::assessment-result.assessment-result`)

Persists the candidate's scored SJT output.

| Attribute | Type | Notes |
|---|---|---|
| `assessment` | relation -> Assessment | links to the SJT definition |
| `users_permissions_user` | relation -> User | always set server-side, never from body |
| `assessmentStatus` | enum | `pending \| in-progress \| completed \| expired` |
| `rawScore` | decimal | total points earned |
| `maxScore` | decimal | `questionCount * 5` |
| `score` | decimal | percentage score |
| `passed` | boolean | `score >= passThreshold` |
| `ratingBand` | string | `Excellent \| Strong \| Moderate \| Limited \| Weak` |
| `rawData` | json | selected options and question data |
| `metrics` | json | computed breakdown stored for dashboards |
| `durationSeconds` | integer | derived from `completedAt - startedAt` |
| `attemptNumber` | integer | incremented per previous result for the same user + type |

---

## Scoring Logic (`sjt-scoring.ts`)

Single source of truth for all SJT scoring.

Each question has four responses:

```md
Best answer = 5 points
Good answer = 3 points
Weak answer = 1 point
Unsafe answer = 0 points
```

Formula:

```md
rawScore = sum(selectedOption.score)
maxScore = totalQuestions * 5
overallScore = (rawScore / maxScore) * 100
```

### Overall Score -> Rating Band

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
CandidateAssessmentSettings.sjtPassThreshold
  -> Campaign.sjtConfig.passThreshold
    -> Assessment config component passThreshold
      -> SJT_PASS_THRESHOLD constant
```

---

## Candidate Submission Format

The frontend should submit selected options only. Scores must not be trusted from the client.

```json
{
  "startedAt": "2026-05-25T10:00:00Z",
  "completedAt": "2026-05-25T10:20:00Z",
  "rawData": {
    "responses": [
      {
        "questionId": "SJT-001",
        "selectedOptionId": "SJT-001-A"
      },
      {
        "questionId": "SJT-002",
        "selectedOptionId": "SJT-002-D"
      }
    ]
  }
}
```

Backend should:

1. Load each question by ID.
2. Validate that the selected option belongs to that question.
3. Read the option score server-side.
4. Calculate raw score, max score, percentage score, pass/fail, and rating band.
5. Persist the result.

---

## Example Calculation

For a 20-question SJT:

```md
Maximum score = 20 * 5 = 100
```

Candidate response profile:

| Classification | Count | Points |
|---|---:|---:|
| Best | 12 | 60 |
| Good | 5 | 15 |
| Weak | 2 | 2 |
| Unsafe | 1 | 0 |

```md
rawScore = 77
maxScore = 100
overallScore = 77%
ratingBand = Strong
```

---

## Metrics To Store

The `metrics` JSON should include:

| Metric | Description |
|---|---|
| `bestAnswerCount` | Number of selected Best answers |
| `goodAnswerCount` | Number of selected Good answers |
| `weakAnswerCount` | Number of selected Weak answers |
| `unsafeAnswerCount` | Number of selected Unsafe answers |
| `rawScore` | Total points earned |
| `maxScore` | Total points available |
| `percentageScore` | Final score as percentage |
| `ratingBand` | Performance band |
| `competencyBreakdown` | Score grouped by competency |
| `durationSeconds` | Time taken |

`unsafeAnswerCount` should be clearly exposed to Hiring Managers and Clients because unsafe choices may need review even where the overall score is acceptable.

Example metrics:

```json
{
  "bestAnswerCount": 12,
  "goodAnswerCount": 5,
  "weakAnswerCount": 2,
  "unsafeAnswerCount": 1,
  "rawScore": 77,
  "maxScore": 100,
  "percentageScore": 77,
  "ratingBand": "Strong",
  "competencyBreakdown": {
    "riskAwareness": {
      "rawScore": 24,
      "maxScore": 30,
      "percentageScore": 80
    },
    "communication": {
      "rawScore": 18,
      "maxScore": 25,
      "percentageScore": 72
    }
  },
  "durationSeconds": 1200
}
```

---

## Endpoints

Recommended endpoint shape:

| Method | Path | Actor | Description |
|---|---|---|---|
| `GET` | `/api/assessment/situational-judgement` | Candidate | Fetch SJT definition + config |
| `POST` | `/api/assessment/situational-judgement/session` | Candidate | Initialise session and receive assigned questions |
| `POST` | `/api/assessment/situational-judgement/results` | Candidate | Submit responses for backend scoring |
| `GET` | `/api/assessment/situational-judgement/results/mine` | Candidate | Own result history, without final score if candidate results are hidden |
| `GET` | `/api/assessment/situational-judgement/results` | Hiring Manager / Admin | All SJT results, paginated |
| `GET` | `/api/assessment/situational-judgement/results/stats` | Hiring Manager / Admin | Aggregated SJT statistics |

Client visibility should be handled through shared candidate/report access, not by allowing unrestricted result access.

---

## Submission Flow

Endpoint:

```md
POST /api/assessment/situational-judgement/results
```

Body:

```json
{
  "startedAt": "2026-05-25T10:00:00Z",
  "completedAt": "2026-05-25T10:20:00Z",
  "rawData": {
    "responses": [
      {
        "questionId": "SJT-001",
        "selectedOptionId": "SJT-001-A"
      }
    ]
  }
}
```

Backend flow:

1. Authenticate via `ctx.state.user`.
2. Look up `Assessment` by slug `situational-judgement`.
3. Validate assessment is active.
4. Validate required fields: `startedAt`, `completedAt`, `rawData.responses[]`.
5. Run idempotency check: reject with `409 Conflict` if a completed SJT result already exists for this user + assessment type.
6. Load all submitted questions and selected options server-side.
7. Validate each selected option belongs to the submitted question.
8. Score each response using server-side option classifications.
9. Compute:
   - `rawScore`
   - `maxScore`
   - `score`
   - `passed`
   - `ratingBand`
   - `metrics`
   - `durationSeconds`
   - `attemptNumber`
10. Persist `AssessmentResult`.
11. Return a candidate-safe response.

Candidate response should not include score:

```json
{
  "data": {
    "documentId": "result-document-id",
    "submitted": true,
    "completedAt": "2026-05-25T10:20:00Z"
  }
}
```

Hiring Manager / Client result views can include:

```json
{
  "data": {
    "documentId": "result-document-id",
    "score": 77,
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
| Score integrity | Option scores are read server-side; client-supplied scores must be ignored |
| Option validation | Selected option must belong to the submitted question |
| Idempotency | A candidate cannot submit a second completed SJT result for the same assessment type |
| Result visibility | SJT scores are not returned to the Candidate; visible to Hiring Manager and Client only |
| Auditability | Store submitted question IDs, selected option IDs, classifications, and computed metrics |

---

## File Reference

Recommended backend files:

| File | Role |
|---|---|
| `src/api/assessment/services/sjt-scoring.ts` | Scoring constants, classification map, `scoreSjtResponses` |
| `src/api/assessment/services/result-scorer.ts` | Strategy dispatcher routes SJT `rawData` to the SJT scorer |
| `src/api/assessment/services/assessment.ts` | `submitResults`, `getMyResults`, `getAllResults`, `getStats`, `sessionInit` |
| `src/api/assessment/controllers/assessment.ts` | HTTP handlers for custom SJT routes |
| `src/api/assessment/routes/01-custom-routes-assessment.ts` | Route definitions for SJT endpoints |
| `src/api/assessment-result/content-types/assessment-result/schema.json` | `AssessmentResult` schema |
| `src/api/sjt-question/content-types/sjt-question/schema.json` | SJT question schema |
| `src/components/assessment-config/situational-judgement.json` | Global SJT config component |
| `src/components/campaign-config/situational-judgement.json` | Per-campaign SJT config component |

---

## Open Backend Decisions

| Decision | Recommendation |
|---|---|
| Pass threshold | Define with product team after sample question set is finalised |
| Question count | 15-20 questions for MVP |
| Candidate result visibility | Candidate should see completion only, not final score |
| Option order | Randomise option order, but preserve server-side scoring |
| Question order | Optional; can stay fixed for MVP if consistency is preferred |
| Unsafe answer handling | Expose unsafe count clearly in HM/Client reports |
