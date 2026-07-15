import type { HiringManagerAssessmentResult } from "@/services/hiring-manager-portal-client.service";

export function hasCallSimulationReportBreakdown(result: HiringManagerAssessmentResult | null): boolean {
  return Boolean(result?.metrics && result.numericScore !== null);
}
