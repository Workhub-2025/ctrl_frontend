export type IntegrityEventType =
  | "assessment_started"
  | "assessment_completed"
  | "window_blur"
  | "window_focus"
  | "tab_hidden"
  | "tab_visible"
  | "copy_attempt"
  | "paste_attempt"
  | "context_menu_attempt"
  | "fullscreen_exit"
  | "heartbeat";

export const INTEGRITY_VIOLATION_EVENT_TYPES = new Set<IntegrityEventType>([
  "window_blur",
  "tab_hidden",
  "copy_attempt",
  "paste_attempt",
  "context_menu_attempt",
  "fullscreen_exit",
]);

export function isIntegrityViolationEvent(eventType: string): boolean {
  return INTEGRITY_VIOLATION_EVENT_TYPES.has(eventType as IntegrityEventType);
}

export const INTEGRITY_EVENT_PENALTY = 5;

export function computeIntegrityScoreFromViolationCount(violationCount: number): number {
  if (violationCount <= 0) return 100;
  return Math.max(0, 100 - violationCount * INTEGRITY_EVENT_PENALTY);
}
