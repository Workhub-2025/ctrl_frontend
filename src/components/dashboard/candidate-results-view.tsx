"use client";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAssessmentUiPlugin } from "@/assessments/plugins/registry";
import { AssessmentReportBreakdown } from "@/assessments/plugins/report";
import { CandidateResponses } from "@/assessments/plugins/report/candidate-responses";
import { REPORT_VERSION } from "@/lib/assessment-report-contract";
import { reportStatus } from "@/lib/hiring-manager/report-presentation";
import { AssessmentAbandonedActions } from "@/components/dashboard/assessment-abandoned-actions";
import type { HiringManagerCandidateReport } from "@/types/hiring-manager.types";

const figure = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? new Intl.NumberFormat("en-GB", {maximumFractionDigits: 1}).format(value) : typeof value === "string" ? value : "—";
export function CandidateResultsView({report, onRefresh, actions, evidenceUrl}: {report: HiringManagerCandidateReport; onRefresh: () => void; actions?: ReactNode;
  /** Passed through to the responses panel; the public demo report supplies an unauthenticated endpoint. */
  evidenceUrl?: ComponentProps<typeof CandidateResponses>["evidenceUrl"]}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  useEffect(() => setExpanded(new Set()), [report.sessionId]);
  const results = report.results;
  const completed = results.filter(result => result.assessmentStatus === "completed" && result.numericScore !== null).length;
  const complete = results.length > 0 && completed === results.length;
  const overall = complete ? report.compositeScore : null;
  const observations = results.flatMap(result => {
    const insights = result.metrics?.insights;
    return Array.isArray(insights) ? insights.filter(item => item?.kind === "explore" && typeof item.evidence === "string").map(item => ({...item, assessment: result.title ?? result.assessment, assessmentId: result.campaignAssessmentId ?? result.id})) : [];
  });
  const decisions: Record<string, string> = {approved: "Move forward", rejected: "Rejected", pending: "Decision pending"};
  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="space-y-3 border-b border-border pb-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Candidate results</p>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="break-words font-display text-3xl font-semibold tracking-tight">{report.candidate.name}</h1>
        <span className="rounded-md border border-border px-3 py-1.5 text-xs font-medium">{decisions[report.hmDecision ?? "pending"] ?? "Decision pending"}</span>
      </div>
      <p className="break-words text-sm text-muted-foreground">{[report.candidate.email, report.campaign.name, report.campaign.role, report.assessmentSession?.name].filter(Boolean).join(" · ")}</p>
      {report.assessmentSession?.startsAt && <p className="text-xs text-muted-foreground">Session: {new Date(report.assessmentSession.startsAt).toLocaleString("en-GB")}</p>}
      {report.clientReviewStatus && <p className="text-sm text-muted-foreground">Client review: {report.clientReviewStatus.replaceAll("_", " ")}</p>}
    </header>

    <section aria-label="Results summary" className="grid gap-6 rounded-lg border border-border bg-card p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Campaign-weighted score</h2>
        {overall === null ? <p className="text-2xl font-semibold">Results incomplete</p> : <p className="text-4xl font-semibold tabular-nums">{figure(overall)}<span className="ml-1 text-base font-normal text-muted-foreground">/100</span></p>}
        <p className="text-sm">{completed} of {results.length} assessments complete</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{overall === null ? "The combined score is available when all required assessments have numerical results." : "Uses the campaign’s assessment weights. Review each assessment’s standard and supporting evidence before recording a decision."}</p>
      </div>
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Areas to explore</h2>
        {observations.length ? <ul className="space-y-3">{observations.slice(0, 4).map((item, index) => <li key={`${item.assessmentId}-${item.id}-${index}`} className="text-sm">
          <button className="min-h-11 text-left font-medium underline decoration-border underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" onClick={() => {
            setExpanded(current => new Set(current).add(item.assessmentId));
            document.getElementById(`assessment-${item.assessmentId}`)?.scrollIntoView({block: "start"});
          }}>{item.assessment} · {item.title}</button>
          <p className="leading-relaxed text-muted-foreground">{item.evidence}</p>
        </li>)}</ul> : <p className="text-sm leading-relaxed text-muted-foreground">{complete ? "No specific areas to explore were identified in the available observations. Review the individual assessment records below." : "Observations will appear as assessment results become available."}</p>}
        {observations.length > 4 && <p className="text-xs text-muted-foreground">{observations.length - 4} further observations are available in the assessment breakdowns.</p>}
      </div>
    </section>

    <section aria-label="Assessment breakdowns" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Assessment breakdowns</h2>
        <div className="flex gap-2">
          <Button variant="ghost" className="min-h-11" disabled={!results.length} onClick={() => setExpanded(new Set(results.map(result => result.campaignAssessmentId ?? result.id)))}>Expand all</Button>
          <Button variant="ghost" className="min-h-11" disabled={!expanded.size} onClick={() => setExpanded(new Set())}>Collapse all</Button>
        </div>
      </div>
      {!results.length && <p className="rounded-lg border border-border p-5 text-sm text-muted-foreground">No assessments are assigned to this candidate.</p>}
      {results.map(result => {
        const id = result.campaignAssessmentId ?? result.id;
        const plugin = getAssessmentUiPlugin(result.assessment);
        const open = expanded.has(id);
        const scored = result.assessmentStatus === "completed";
        const supported = plugin && result.metrics?.reportVersion === REPORT_VERSION && Array.isArray(result.metrics?.competencyScores);
        return <article id={`assessment-${id}`} key={id} className="scroll-mt-4 overflow-hidden rounded-lg border border-border bg-card">
          <h3><button aria-expanded={open} aria-controls={`breakdown-${id}`} className="flex min-h-16 w-full items-start justify-between gap-3 p-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-[-2px]" onClick={() => setExpanded(current => {const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next;})}>
            <span className="min-w-0 space-y-2">
              <span className="block text-base font-semibold">{result.title ?? plugin?.title ?? result.assessment}</span>
              <span className="block text-xs font-normal text-muted-foreground">{reportStatus(result)}</span>
            </span>
            <span className="flex shrink-0 items-center gap-3"><span className="text-lg font-semibold tabular-nums">{scored && result.numericScore !== null ? `${figure(result.numericScore)}%` : "—"}</span><ChevronDown aria-hidden="true" className={`h-4 w-4 ${open ? "rotate-180" : ""}`} /></span>
          </button></h3>
          <dl className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-3">
            {(plugin?.headlineMetrics ?? []).slice(0, 3).map(metric => {
              const value = scored ? result.metrics?.[metric.key] : null;
              const maximum = metric.maximumKey ? result.metrics?.[metric.maximumKey] : null;
              return <div key={metric.key} className="flex items-baseline justify-between gap-2 text-sm sm:block"><dt className="text-xs text-muted-foreground">{metric.label}</dt><dd className="mt-1 font-medium tabular-nums">{figure(value)}{value != null ? maximum != null ? ` / ${figure(maximum)}` : metric.suffix ?? "" : ""}</dd></div>;
            })}
          </dl>
          {open && <div id={`breakdown-${id}`} className="space-y-5 border-t border-border p-4 sm:p-5">
            {scored && supported ? <AssessmentReportBreakdown slug={result.assessment} result={result} /> : <p className="text-sm text-muted-foreground">{scored ? "Detailed evidence unavailable for this report version. The recorded score is shown above." : result.assessmentStatus === "marking-failed" ? "Marking could not be completed. This is a technical issue, not a failed assessment." : result.metrics?.scoringStalled ? "Marking is delayed and will retry. This report will refresh when the result is ready." : `Status: ${reportStatus(result)}. A scoring breakdown will appear when a result is available.`}</p>}
            <p className="text-xs text-muted-foreground">{typeof result.weight === "number" ? `Campaign weight: ${figure(result.weight)}%. ` : ""}{result.metrics?.releaseVersion ? `Assessment version ${result.metrics.releaseVersion}. ` : ""}{result.metrics?.revision ? `Result revision ${result.metrics.revision}.` : ""}</p>
            {result.integrityEventCount != null && <p className="text-xs text-muted-foreground">Monitoring events: {result.integrityEventCount}. These are separate from assessment performance.</p>}
            {scored && result.campaignAssessmentId && <CandidateResponses assignmentId={report.sessionId} result={result} onResultChanged={onRefresh} {...(evidenceUrl ? {evidenceUrl} : {})} />}
            {result.assessmentStatus === "abandoned" && <AssessmentAbandonedActions candidateSessionDocumentId={report.sessionId} assessmentSlug={result.assessment} assessmentLabel={result.title ?? result.assessment} candidateName={report.candidate.name} candidateEmail={report.candidate.email} campaignName={report.campaign.name} snapshot={null} contentVersion={typeof result.metrics?.releaseVersion === "string" ? result.metrics.releaseVersion : null} onRecovered={onRefresh} />}
          </div>}
        </article>;
      })}
    </section>
    {actions}
  </div>;
}
