export type StageNode = {
  id: string;
  kind: string;
  title: string;
  assessed: boolean;
  breakAfter?: boolean;
};

export type StageGraph = {
  entry: string;
  nodes: StageNode[];
  edges: Array<{ from: string; to: string; when?: string }>;
};

export type MediaReference = { url: string; sha256: string };

export type CallSimulationAction = {
  id: string;
  label: string;
  branchMediaId: string;
  branchSummary: string;
};

export type CallSimulationScenario = {
  id: string;
  title: string;
  stratum: string;
  baseMediaId: string;
  dispatchContext: string;
  actionPrompt: string;
  actions: CallSimulationAction[];
  classificationOptions: string[];
  incidentTypeOptions: string[];
  resourceOptions: string[];
  captureFields: Array<{
    id: string;
    label: string;
    inputMode?: "text" | "tel";
  }>;
  transcripts?: Record<string, string>;
};

export type AssessmentReadiness<TPractice = unknown> = {
  module: {
    moduleId: string;
    slug: string;
    releaseVersion: string;
    title: string;
    description: string;
    evidenceLabel: string;
    durationMinutes: { minimum: number; maximum: number };
  };
  instructions: string[];
  requirements: string[];
  checks: string[];
  support: { label: string; email: string };
  practice: TPractice;
  media: Record<string, MediaReference>;
  delivery: { deliveryVariant: string; extraTimeMinutes: number };
  monitoringActive: false;
};

export type LaunchEnvelope<TContent = unknown> = {
  attemptId: string;
  status: "in_progress";
  module: {
    id: string;
    slug: string;
    releaseVersion: string;
    releaseHash: string;
    manifestHash: string;
    contentHash: string;
    mediaHash: string;
  };
  serverTime: string;
  startedAt: string;
  deadlineAt: string;
  stageGraph: StageGraph;
  content: TContent;
  media: Record<string, MediaReference>;
  integrity: {
    heartbeatIntervalSeconds: number;
    heartbeatLockSeconds: number;
    focusViolationLimit: number;
    focusLossLockSeconds: number;
    blockClipboard: boolean;
    blockContextMenu: boolean;
    pauseOnHidden: boolean;
    pauseOnFullscreenExit: boolean;
  };
  deliveryVariant: string;
  extraTimeMinutes: number;
  progressRevision: number;
};

export type AssessmentRenderer = {
  slug: string;
  supportedMajorVersions: readonly number[];
  stageRenderers: Readonly<Record<string, string>>;
  ReadinessComponent: ComponentType<{
    candidateSessionDocumentId: string;
    slug: string;
  }>;
};
import type { ComponentType } from "react";
