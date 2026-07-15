import type { AssessmentRenderer } from "../types";
import { CallSimulationReadinessPage } from "./readiness-page";

export const callSimulationV2Renderer: AssessmentRenderer = {
  slug: "call-simulation",
  supportedMajorVersions: [2],
  ReadinessComponent: CallSimulationReadinessPage,
  stageRenderers: {
    briefing: "BriefingStage",
    "custom:incident-workspace": "IncidentWorkspaceStage",
    review: "ReviewStage",
    completion: "CompletionStage",
  },
};
