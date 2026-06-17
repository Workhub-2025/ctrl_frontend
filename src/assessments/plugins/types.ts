import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import type { AssessmentReportBreakdownProps } from "./report/types";

export type AssessmentSessionProps = {
  candidateSessionDocumentId: string | null;
};

export interface AssessmentUiPlugin {
  slug: string;
  title: string;
  description: string;
  duration?: string;
  /** Canonical candidate route — `/assessment/{slug}`. */
  href: string;
  icon: LucideIcon;
  /** Recovery restart-only (typing allows resume). */
  timed: boolean;
  supportsHeartbeat: boolean;
  component: ComponentType<AssessmentSessionProps>;
  shellTitle?: string;
  /** Server-side session init before render (typing). */
  requiresServerInit?: boolean;
  /** Strapi POST path for session init, e.g. `/assessment/typing/session`. */
  strapiSessionPath?: string;
  /** Optional HM report performance breakdown panel. */
  reportBreakdown?: ComponentType<AssessmentReportBreakdownProps>;
  /** Returns true when result has expandable HM breakdown content. */
  hasReportBreakdown?: (result: AssessmentReportBreakdownProps["result"]) => boolean;
}
