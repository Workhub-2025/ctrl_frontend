import { z } from "zod";
import { parseReportMetrics } from "@/lib/assessment-report-contract";
import type { HiringManagerCandidateReport } from "@/types/hiring-manager.types";
const result = z.object({
  id: z.string(), campaignAssessmentId: z.string().optional(), assessment: z.string(), title: z.string().optional(), weight: z.number().finite().optional(),
  score: z.string(), numericScore: z.number().finite().nullable(), assessmentStatus: z.string().nullable().optional(),
  metrics: z.record(z.string(), z.unknown()).nullable().optional()
}).passthrough();
const report = z.object({
  sessionId: z.string(), candidate: z.object({name: z.string(), documentId: z.string().nullable(), email: z.string().optional()}),
  campaign: z.object({documentId: z.string(), name: z.string(), role: z.string(), assessmentStack: z.array(z.string())}).passthrough(),
  results: z.array(result), compositeScore: z.number().finite().nullable()
}).passthrough();
export function validateCandidateReport(value: unknown): HiringManagerCandidateReport {
  const parsed = report.parse(value);
  for (const result of parsed.results) {
    const metrics = result.metrics;
    if (!metrics) continue;
    const valid = parseReportMetrics(result.assessment, metrics);
    if (!valid) {
      // Keep identity/status for generic rows, but do not send an unknown shape
      // into an assessment-specific renderer.
      result.metrics = Object.fromEntries(["attemptId", "resultId", "revision", "releaseId", "releaseHash", "releaseVersion", "campaignAssessmentId", "reportVersion", "scoringStalled", "evidenceAvailability"].map(key => [key, metrics[key]]));
    }
  }
  return parsed as unknown as HiringManagerCandidateReport;
}
