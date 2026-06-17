import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

export type AssessmentSessionProps = {
  candidateSessionDocumentId: string | null;
};

export interface AssessmentUiPlugin {
  slug: string;
  title: string;
  description: string;
  duration?: string;
  href: string;
  icon: LucideIcon;
  /** Recovery restart-only (typing allows resume). */
  timed: boolean;
  supportsHeartbeat: boolean;
  component: ComponentType<AssessmentSessionProps>;
  shellTitle?: string;
  requiresServerInit?: boolean;
}
