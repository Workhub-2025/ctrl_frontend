import type { AssessmentRenderer } from "../types";
import { TypingModulePage } from "./module-page";

export const typingV2Renderer: AssessmentRenderer = {
  slug: "typing",
  supportedMajorVersions: [2],
  ReadinessComponent: TypingModulePage,
  stageRenderers: {
    briefing: "BriefingStage",
    "custom:operational-transcription": "OperationalTranscriptionStage",
    review: "ReviewStage",
    completion: "CompletionStage",
  },
};
