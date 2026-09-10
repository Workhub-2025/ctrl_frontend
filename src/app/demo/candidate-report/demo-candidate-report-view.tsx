"use client";
import { useState } from "react";
import { CandidateResultsView } from "@/components/dashboard/candidate-results-view";
import { Button } from "@/components/ui/button";
import { DEMO_REPORTS, type DemoProfile } from "@/lib/demo/demo-candidate-report";
import type { HiringManagerAssessmentResult } from "@/types/hiring-manager.types";

/** The demo report is public, so responses come from the fixture route, not the HM BFF. */
function demoEvidenceUrl(_assignmentId: string, result: HiringManagerAssessmentResult) {
  return `/api/demo/candidate-report/evidence?campaignAssessmentId=${encodeURIComponent(result.campaignAssessmentId ?? "")}`;
}

export function DemoCandidateReportView() {
  const [profile, setProfile] = useState<DemoProfile>(
    DEMO_REPORTS[0]?.profile ?? "strong",
  );
  const active = DEMO_REPORTS.find((entry) => entry.profile === profile) ?? DEMO_REPORTS[0];
  if (!active) return null;

  return (
    <div className="px-4 py-8 sm:px-6">
      <div className="mx-auto mb-6 max-w-6xl space-y-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Example report
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Two example candidates on the same five-assessment campaign. The scores,
            competency breakdowns and follow-up questions are produced by the live
            scoring engine — only the candidates are invented.
          </p>
        </div>

        <div
          role="group"
          aria-label="Choose an example candidate"
          className="flex flex-wrap gap-2"
        >
          {DEMO_REPORTS.map((entry) => {
            const selected = entry.profile === profile;
            return (
              <Button
                key={entry.profile}
                variant={selected ? "default" : "outline"}
                aria-pressed={selected}
                className="min-h-11 flex-col items-start gap-0.5 py-2 text-left"
                onClick={() => setProfile(entry.profile)}
              >
                <span className="font-medium">{entry.label}</span>
                <span className="text-xs font-normal opacity-80">{entry.summary}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <CandidateResultsView
        report={active.report}
        // Nothing to refresh: the fixture is frozen.
        onRefresh={() => {}}
        evidenceUrl={demoEvidenceUrl}
      />
    </div>
  );
}
