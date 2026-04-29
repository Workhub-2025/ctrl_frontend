# Assessment Components

This folder is organised by assessment area so each assessment can grow without turning the root folder into a mixed list of large files.

## Structure

- `shared/` - shared visual building blocks used by assessment experiences.
- `security/` - secure assessment shell, preflight, and browser-control UI.
- `typing/` - Typing Speed & Accuracy assessment.
- `call-simulation/` - Call Simulation assessment.
- `prioritization/` - Incident Prioritisation assessment.
- `situational-judgement/` - Situational Judgement / Response Selection assessment.
- `placeholder/` - temporary placeholder assessment components.

Use the root `index.ts` barrel for route/page imports:

```ts
import { TypingTest, SecureAssessmentShell } from '@/components/assessment';
```

Use section-level barrels for internal assessment imports:

```ts
import { AssessmentGameShell } from '@/components/assessment/shared';
```
