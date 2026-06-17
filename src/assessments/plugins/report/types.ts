import type { HiringManagerAssessmentResult } from "@/services/hiring-manager-portal-client.service";

export type AssessmentReportBreakdownProps = {
  result: HiringManagerAssessmentResult | null;
};

export type AssessmentReportRowContext = {
  name: string;
  score: number | null;
  result: HiringManagerAssessmentResult | null;
};
