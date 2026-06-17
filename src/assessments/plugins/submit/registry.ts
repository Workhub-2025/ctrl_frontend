import { callSimulationSubmitHandler } from "./call-simulation";
import { prioritisationSubmitHandler } from "./prioritisation";
import { situationalJudgementSubmitHandler } from "./situational-judgement";
import { typingSubmitHandler } from "./typing";
import type { AssessmentSubmitHandler } from "./types";

const submitHandlers = new Map<string, AssessmentSubmitHandler>([
  ["typing", typingSubmitHandler as AssessmentSubmitHandler],
  ["call-simulation", callSimulationSubmitHandler as AssessmentSubmitHandler],
  ["situational-judgement", situationalJudgementSubmitHandler as AssessmentSubmitHandler],
  ["prioritisation", prioritisationSubmitHandler as AssessmentSubmitHandler],
]);

export function getAssessmentSubmitHandler(slug: string): AssessmentSubmitHandler | undefined {
  return submitHandlers.get(slug);
}

export function listAssessmentSubmitSlugs(): string[] {
  return [...submitHandlers.keys()];
}
