"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getAssessmentCatalogueIcon,
  getAssessmentCatalogueTitle,
} from "@/assessments/plugins/display";
import {
  AssessmentReportBreakdown,
  hasAssessmentReportBreakdown,
} from "@/assessments/plugins/report/index";
import {
  portalIconWrapClass,
  portalLabelClass,
  portalPanelBorderClass,
  portalPanelNestedClass,
  portalProgressBarClass,
  portalScoreMeterClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { getAssessmentKey } from "@/lib/hiring-manager/assessment-matching";
import { isAbandonedAssessmentResult } from "@/lib/assessment-result-status";
import { cn } from "@/lib/utils";
import type {
  HiringManagerAssessmentResult,
  HiringManagerResolvedStackSummary,
} from "@/types/hiring-manager.types";

type ClientAssignmentReport = {
  results: HiringManagerAssessmentResult[];
  compositeScore: number | null;
  assessmentStack: string[];
  resolvedStackSummary: HiringManagerResolvedStackSummary | null;
};

function weightFor(
  report: ClientAssignmentReport,
  slug: string,
): number | null {
  const entry = report.resolvedStackSummary?.assessments.find(
    (assessment) => assessment.slug === slug,
  );
  return entry ? entry.weight : null;
}

/**
 * Assessment evidence for a released candidate, shown inside the client review
 * queue. Uses the same breakdown plugins as the hiring-manager report so both
 * portals present one account of the candidate's performance.
 */
export function ClientCandidateAssessmentPanel({
  sharedCandidateDocumentId,
  className,
}: {
  sharedCandidateDocumentId: string;
  className?: string;
}) {
  const [report, setReport] = useState<ClientAssignmentReport | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openBreakdownSlug, setOpenBreakdownSlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/client/shared-candidates/${encodeURIComponent(sharedCandidateDocumentId)}/report`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Assessment results are unavailable.");
      }
      setReport(payload.data as ClientAssignmentReport);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Assessment results are unavailable.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [sharedCandidateDocumentId]);

  useEffect(() => {
    if (isOpen && !report && !isLoading && !error) void load();
  }, [isOpen, report, isLoading, error, load]);

  const composite = report?.compositeScore ?? null;

  return (
    <div className={cn(portalPanelNestedClass, "p-4", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2">
          <span className={portalIconWrapClass} aria-hidden="true">
            <ClipboardList className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold text-foreground">
            Assessment results
          </span>
        </span>
        <span className="flex items-center gap-3">
          {composite !== null ? (
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {composite}
              <span className="ml-0.5 text-xs font-medium text-muted-foreground">
                /100
              </span>
            </span>
          ) : null}
          <ChevronDown
            className="h-4 w-4 text-muted-foreground"
            style={{
              transform: isOpen ? "rotate(-180deg)" : "rotate(0deg)",
              transition: "transform 250ms ease",
            }}
            aria-hidden="true"
          />
        </span>
      </button>

      {!isOpen ? null : isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading results…</p>
      ) : error ? (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      ) : !report || report.results.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No scored assessments have been recorded for this candidate yet.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {composite !== null ? (
            <div>
              <p className={portalLabelClass}>Weighted score</p>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted/40 dark:bg-white/10">
                <div
                  className={portalScoreMeterClass}
                  style={{ width: `${Math.max(0, Math.min(100, composite))}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              A weighted score appears once every assessment in the campaign has
              been completed.
            </p>
          )}

          {report.results.map((result) => {
            const slug = getAssessmentKey(result.assessment, result);
            const title = getAssessmentCatalogueTitle(
              slug || result.assessment,
              result.assessment,
            );
            const Icon = getAssessmentCatalogueIcon(
              slug || result.assessment,
              result,
            );
            const weight = weightFor(report, slug || result.assessment);
            const abandoned = isAbandonedAssessmentResult(result.assessmentStatus);
            const hasBreakdown = slug
              ? hasAssessmentReportBreakdown(slug, result)
              : false;
            const breakdownOpen = openBreakdownSlug === result.assessment;

            return (
              <div
                key={result.id}
                className={cn("space-y-3 border-t pt-4", portalPanelBorderClass)}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {title}
                    {weight !== null ? (
                      <span className="text-xs font-medium text-muted-foreground">
                        {weight}% weight
                      </span>
                    ) : null}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {abandoned
                      ? "Abandoned"
                      : result.numericScore === null
                        ? "Pending"
                        : `${result.numericScore}%`}
                  </span>
                </div>

                {result.numericScore !== null ? (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40 dark:bg-white/10">
                    <div
                      className={portalProgressBarClass}
                      style={{ width: `${result.numericScore}%` }}
                    />
                  </div>
                ) : null}

                {hasBreakdown && slug ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg px-3 text-xs"
                      onClick={() =>
                        setOpenBreakdownSlug(
                          breakdownOpen ? null : result.assessment,
                        )
                      }
                    >
                      {breakdownOpen ? "Hide breakdown" : "View breakdown"}
                    </Button>
                    {breakdownOpen ? (
                      <div className={cn(portalPanelNestedClass, "p-4")}>
                        <AssessmentReportBreakdown slug={slug} result={result} />
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
