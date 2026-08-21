import "server-only";

/**
 * @deprecated Import `forwardAssessmentRuntime` from
 * `@/lib/assessment-runtime-server`. Kept temporarily so outstanding branches
 * do not break while the persistence-neutral import is adopted.
 */
export { forwardAssessmentRuntime as forwardFirebaseAssessmentRuntime } from "@/lib/assessment-runtime-server";
