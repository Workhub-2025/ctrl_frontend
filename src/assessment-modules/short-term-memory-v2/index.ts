import type { AssessmentRenderer } from "../types";
import { ShortTermMemoryModulePage } from "./module-page";

export const shortTermMemoryV2Renderer: AssessmentRenderer = {
  slug: "short-term-memory",
  supportedMajorVersions: [2],
  ReadinessComponent: ShortTermMemoryModulePage,
  stageRenderers: {
    briefing: "BriefingStage",
    "custom:timed-briefing": "TimedBriefingStage",
    "custom:interruption-task": "InterruptionStage",
    "structured-capture": "RecallStage",
    classification: "SequenceStage",
    "custom:record-correction": "RecordCorrectionStage",
    review: "ReviewStage",
    completion: "CompletionStage",
  },
};
