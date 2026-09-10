"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { reportEvidenceSchema, type AssessmentReportEvidence } from "@/lib/assessment-report-contract";
import type { HiringManagerAssessmentResult } from "@/types/hiring-manager.types";
import { reportIdentity } from "@/lib/hiring-manager/report-presentation";

/** Default endpoint: the authenticated hiring-manager BFF route. */
function hiringManagerEvidenceUrl(assignmentId: string, result: HiringManagerAssessmentResult) {
  return `/api/hiring-manager/candidate-sessions/${encodeURIComponent(assignmentId)}/report/assessments/${encodeURIComponent(result.campaignAssessmentId ?? "")}/evidence`;
}

export function CandidateResponses({ assignmentId, result, onResultChanged, evidenceUrl = hiringManagerEvidenceUrl }: {
  assignmentId: string; result: HiringManagerAssessmentResult; onResultChanged: () => void;
  /** Overridden by the public demo report, which cannot reach an authenticated route. */
  evidenceUrl?: (assignmentId: string, result: HiringManagerAssessmentResult) => string;
}) {
  const [data, setData] = useState<AssessmentReportEvidence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const identity = reportIdentity(result);
  useEffect(() => { controller.current?.abort(); setData(null); setError(null); setOpen(false); setLoading(false); return () => controller.current?.abort(); }, [identity]);
  async function load() {
    setOpen(true); setLoading(true); setError(null);
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    try {
      const response = await fetch(evidenceUrl(assignmentId, result), {cache: "no-store", signal: request.signal});
      if (!response.ok) throw new Error("Candidate responses could not be loaded. Please retry.");
      const body = await response.json();
      const evidence = reportEvidenceSchema.parse(body.data);
      if (request.signal.aborted) return;
      const metrics = result.metrics ?? {};
      if (evidence.campaignAssessmentId !== result.campaignAssessmentId || evidence.attemptId !== metrics.attemptId || evidence.resultId !== metrics.resultId || evidence.revision !== metrics.revision || evidence.releaseHash !== metrics.releaseHash || evidence.releaseId !== metrics.releaseId) {
        onResultChanged(); throw new Error("This result has changed. The report is refreshing; reopen the responses once it has updated.");
      }
      setData(evidence);
    } catch (error) { if (!request.signal.aborted) setError(error instanceof Error ? error.message : "Candidate responses are unavailable."); }
    finally { if (!request.signal.aborted) setLoading(false); }
  }
  return <section className="space-y-4 border-t border-border pt-4" aria-label="Candidate responses">
    <Button variant="outline" className="min-h-11" aria-expanded={open} onClick={() => open ? setOpen(false) : data ? setOpen(true) : void load()}>
      {open ? "Hide candidate responses" : "View candidate responses"}
    </Button>
    {open && <div className="space-y-5">
      {loading && <p role="status" className="text-sm text-muted-foreground">Loading candidate responses…</p>}
      {error && <div role="alert" className="space-y-2 text-sm"><p>{error}</p><Button variant="outline" onClick={() => void load()}>Retry</Button></div>}
      {data && data.availability !== "available" && <p className="text-sm text-muted-foreground">{data.availability === "pending" ? "Responses will be available after marking completes." : "Detailed evidence unavailable for this result."}</p>}
      {data?.sections.map(section => <section key={section.id} className="space-y-3">
        <h4 className="font-semibold">{section.title}</h4>
        {section.context && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{section.context}</p>}
        <dl className="divide-y divide-border">
          {section.rows.map(row => <div key={row.id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <dt className="text-sm font-medium">{row.label}</dt>
            <dd className="min-w-0 space-y-2 text-sm">
              {row.context && <p className="text-muted-foreground">{row.context}</p>}
              <p className="whitespace-pre-wrap break-words">{row.response || "No response recorded"}</p>
              {row.score !== null && <p className="font-medium tabular-nums">Awarded: {row.score}{row.maximum !== null ? ` / ${row.maximum}` : ""}</p>}
            </dd>
          </div>)}
        </dl>
      </section>)}
    </div>}
  </section>;
}
