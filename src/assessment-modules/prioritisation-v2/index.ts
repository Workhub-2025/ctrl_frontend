import type { AssessmentRenderer } from "../types";
import { PrioritisationModulePage } from "./module-page";

export const prioritisationV2Renderer: AssessmentRenderer = {
  slug: "prioritisation",
  supportedMajorVersions: [2],
  ReadinessComponent: PrioritisationModulePage,
  stageRenderers: {
    briefing: "BriefingStage",
    "custom:priority-queue": "PriorityQueueStage",
    "custom:queue-updates": "QueueUpdatesStage",
    "choice-action": "ResourcePlanStage",
    handover: "RationaleStage",
    review: "ReviewStage",
    completion: "CompletionStage",
  },
};
