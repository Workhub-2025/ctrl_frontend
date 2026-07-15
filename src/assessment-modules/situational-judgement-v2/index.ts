import type { AssessmentRenderer } from "../types";
import { SituationalJudgementModulePage } from "./module-page";

export const situationalJudgementV2Renderer: AssessmentRenderer = {
  slug: "situational-judgement",
  supportedMajorVersions: [2],
  ReadinessComponent: SituationalJudgementModulePage,
  stageRenderers: {
    briefing: "BriefingStage",
    "custom:branching-judgement": "BranchingJudgementStage",
    review: "ReviewStage",
    completion: "CompletionStage",
  },
};
