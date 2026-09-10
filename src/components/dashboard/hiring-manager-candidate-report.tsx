"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { HiringManagerPortalClientService, type HiringManagerCandidateReport as Report } from "@/services/hiring-manager-portal-client.service";
import { CandidateResultsView } from "./candidate-results-view";
import { SharedCandidateNotesPanel } from "./shared-candidate-notes-panel";
import { usePortalBreadcrumbDetail } from "./portal/portal-shell";
import { reportIsPending } from "@/lib/hiring-manager/report-presentation";

type CandidateReportProps = {candidateId: string; candidateSessionId?: string; embedded?: boolean};
export function HiringManagerCandidateReport({candidateId, candidateSessionId, embedded = false}: CandidateReportProps) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [decisionSubmitting, setDecisionSubmitting] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const current = useRef<Report | null>(null);
  const reload = useRef<() => void>(() => {});
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");
  const campaignIdParam = searchParams.get("campaignId");
  const sessionIdParam = searchParams.get("sessionId");
  const returnUrlParam = searchParams.get("returnUrl");
  const backDestination = useMemo(() => {
    if (returnUrlParam) {
      return { href: returnUrlParam, label: "Back" };
    }
    if (fromParam === "campaign" && campaignIdParam) {
      return {
        href: `/hiring-manager-dashboard/campaigns/${encodeURIComponent(campaignIdParam)}`,
        label: "Back to campaign",
      };
    }
    if (fromParam === "session" && sessionIdParam) {
      return {
        href: `/hiring-manager-dashboard/sessions/${encodeURIComponent(sessionIdParam)}`,
        label: "Back to session",
      };
    }
    if (campaignIdParam) {
      return {
        href: `/hiring-manager-dashboard/campaigns/${encodeURIComponent(campaignIdParam)}`,
        label: "Back to campaign",
      };
    }
    if (sessionIdParam) {
      return {
        href: `/hiring-manager-dashboard/sessions/${encodeURIComponent(sessionIdParam)}`,
        label: "Back to session",
      };
    }
    return {
      href: "/hiring-manager-dashboard/candidates",
      label: "Back to candidates",
    };
  }, [fromParam, campaignIdParam, sessionIdParam, returnUrlParam]);

  const handleBack = (e: React.MouseEvent) => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      e.preventDefault();
      router.back();
    }
  };


  const assignmentId = candidateSessionId ?? candidateId;
  usePortalBreadcrumbDetail(embedded ? null : report?.candidate.name);
  const refresh = useCallback(() => reload.current(), []);
  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    current.current = null; setReport(null); setLoading(true); setError(null);
    async function load() {
      if (inFlight || disposed) return;
      inFlight = true;
      try {
        const data = await HiringManagerPortalClientService.getCandidateReport(assignmentId);
        if (!disposed) { current.current = data; setReport(data); setError(null); }
      } catch (err) { if (!disposed) setError(err instanceof Error ? err.message : "Candidate report could not be loaded."); }
      finally { inFlight = false; if (!disposed) setLoading(false); }
    }
    reload.current = () => void load();
    void load();
    const poll = () => { if (document.visibilityState === "visible" && (!current.current || reportIsPending(current.current.results))) void load(); };
    const interval = window.setInterval(poll, 15000);
    document.addEventListener("visibilitychange", poll);
    return () => { disposed = true; clearInterval(interval); document.removeEventListener("visibilitychange", poll); };
  }, [assignmentId]);
  async function decide(decision: "approve" | "reject") {
    if (!report || decisionSubmitting) return;
    setDecisionSubmitting(decision); setDecisionError(null);
    try {
      const outcome = await HiringManagerPortalClientService.submitCandidateDecision({candidateSessionId: report.sessionId, decision});
      setReport(value => value ? {...value, hmDecision: outcome.hmDecision} : value);
      refresh();
    } catch (err) {setDecisionError(err instanceof Error ? err.message : "The decision could not be saved.");}
    finally {setDecisionSubmitting(null);}
  }
  const complete = report && report.results.length > 0 && report.results.every(result => result.assessmentStatus === "completed" && result.numericScore !== null);
  const canDecide = complete && (!report.hmDecision || report.hmDecision === "pending");
  return <div className="space-y-5">
    {!embedded && <Button variant="outline" className="min-h-11" asChild><Link href={backDestination.href} onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" />{backDestination.label}</Link></Button>}
    {loading && <p role="status" className="rounded-lg border border-border p-6 text-sm">Loading candidate report…</p>}
    {error && <div role="alert" className="space-y-2 rounded-lg border border-destructive p-4 text-sm"><p>{error}</p><Button variant="outline" onClick={refresh}>Retry</Button></div>}
    {report && <CandidateResultsView report={report} onRefresh={refresh} actions={<section aria-label="Hiring decision" className="space-y-3 border-t border-border pt-5">
      {decisionError && <p role="alert" className="text-sm text-destructive">{decisionError}</p>}
      {canDecide && <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">All assessments complete — record your decision.</p><div className="flex gap-2">
        <Button variant="outline" className="min-h-11" disabled={Boolean(decisionSubmitting)} onClick={() => void decide("reject")}>{decisionSubmitting === "reject" ? "Saving…" : "Reject"}</Button>
        <Button className="min-h-11" disabled={Boolean(decisionSubmitting)} onClick={() => void decide("approve")}>{decisionSubmitting === "approve" ? "Saving…" : "Pass"}</Button>
      </div></div>}
      {report.hmDecisionNote && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{report.hmDecisionNote}</p>}
    </section>} />}
    {report?.sharedCandidateDocumentId && <SharedCandidateNotesPanel sharedCandidateDocumentId={report.sharedCandidateDocumentId} portal="hiring_manager" />}
  </div>;
}
