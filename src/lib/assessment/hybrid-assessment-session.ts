"use client";

import {
  AssessmentOutcome,
  HybridAssessmentSummary,
  HybridAssessmentSummarySchema,
} from "@/types";
import { aggregateHybridAssessment } from "@/lib/assessment/hybrid-assessment-model";

const STORAGE_KEY = "ctrl_hybrid_assessment_v1";
const PERSISTED_KEY = "ctrl_hybrid_assessment_persisted_v1";

const canUseStorage = () => typeof window !== "undefined";

const readRaw = (): AssessmentOutcome[] => {
  if (!canUseStorage()) return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AssessmentOutcome[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeRaw = (outcomes: AssessmentOutcome[]) => {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(outcomes));
};

export const resetHybridAssessmentSession = () => {
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(PERSISTED_KEY);
};

export const saveAssessmentOutcomeToSession = (outcome: AssessmentOutcome) => {
  const outcomes = readRaw();
  const withoutSource = outcomes.filter((item) => item.source !== outcome.source);
  writeRaw([...withoutSource, outcome]);
};

export const getHybridAssessmentSummaryFromSession =
  (): HybridAssessmentSummary | null => {
    const outcomes = readRaw();
    if (outcomes.length === 0) return null;

    const summary = aggregateHybridAssessment(outcomes);
    const parsed = HybridAssessmentSummarySchema.safeParse(summary);
    if (!parsed.success) return null;
    return parsed.data;
  };

export const isHybridSummaryPersisted = () => {
  if (!canUseStorage()) return false;
  return window.sessionStorage.getItem(PERSISTED_KEY) === "1";
};

export const markHybridSummaryPersisted = () => {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(PERSISTED_KEY, "1");
};
