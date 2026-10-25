"use client";

import { useCallback, useState } from "react";
import { ClipboardCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAdminResource, invalidateAdminResource } from "@/lib/admin-resource-cache";
import {
  AdminAlert,
  AdminEmptyState,
  AdminInlineLoading,
  AdminPageHeader,
  AdminPanel,
} from "@/components/admin/admin-portal-ui";
import { toast } from "@/hooks/use-toast";
import { formatUkDate } from "@/lib/legal/uk-compliance";

/**
 * Staff queue for call-simulation written answers the model could not decide
 * (low confidence, ambiguous or unusable evidence). A decision re-scores the
 * frozen submission as a new result revision; the earlier one is kept.
 */

type EvidenceReview = {
  id: string;
  attemptId: string;
  releaseVersion: string;
  scenarioId: string;
  label: string;
  policy: { concept: string; rubric: string; facts: string[] } | null;
  candidateEntry: string;
  pendingReason: string;
  modelEvidence: {
    disposition: string;
    confidence: number;
    reason: string;
    quotes: string[];
    facts: { fact: string; status: string; quotes: string[] }[];
  } | null;
  createdAt: string;
};

const REASONS: Record<string, string> = {
  ai_low_confidence_review: "Model confidence below 0.75",
  needs_review: "Model judged the answer ambiguous",
  awaiting_ai_evidence: "No model evidence returned",
  evidence_missing: "No model evidence returned",
  evidence_ungrounded: "Model quoted text the candidate did not write",
  evidence_stale_entry: "Model judged a different answer",
  evidence_minimum_unmet: "Model accepted without the minimum facts",
  evidence_context_invented: "Model inferred a fact from the field label",
  evidence_inconsistent: "Model evidence was inconsistent",
  evidence_facts_incomplete: "Model did not assess every fact",
  evidence_fact_invalid: "Model fact evidence was invalid",
  evidence_shape_invalid: "Model evidence was malformed",
};

const callLabel = (scenarioId: string) =>
  scenarioId.startsWith("call-1") ? "Call 1" : scenarioId.startsWith("call-2") ? "Call 2" : scenarioId;

export function EvidenceReviewPanel() {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [decidingId, setDecidingId] = useState<string | null>(null);
  // The portal fetch helper unwraps the BFF's `{ data }` envelope.
  const { data: rows, error, loading, refetch } = useAdminResource<EvidenceReview[]>(
    "admin:evidence-reviews",
    "/api/admin/evidence-reviews?status=open",
    [],
    undefined,
    { allowEmpty: true },
  );

  const decide = useCallback(
    async (review: EvidenceReview, decision: "accept" | "reject") => {
      const verb = decision === "accept" ? "Accept" : "Reject";
      if (!window.confirm(`${verb} "${review.label}"? The attempt is re-scored and a new result revision is published.`)) {
        return;
      }
      setDecidingId(review.id);
      try {
        const response = await fetch(`/api/admin/evidence-reviews/${encodeURIComponent(review.id)}/decision`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, ...(notes[review.id]?.trim() ? { note: notes[review.id]!.trim() } : {}) }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(typeof body.error === "string" ? body.error : "Decision failed");
        }
        toast({
          title: decision === "accept" ? "Answer accepted" : "Answer rejected",
          description: body?.data?.rescoreQueued
            ? "Re-scoring queued. The report updates once it completes."
            : "Recorded. A re-score already queued for this attempt will include it.",
        });
        invalidateAdminResource("admin:evidence-reviews");
        await refetch();
      } catch (decideError) {
        toast({
          title: "Could not record decision",
          description: decideError instanceof Error ? decideError.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setDecidingId(null);
      }
    },
    [notes, refetch],
  );

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Written answers awaiting review"
        description="Call simulation free text the model could not decide. Judge the answer against the policy; the model never awards marks."
        action={
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "motion-safe:animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}

      {loading ? (
        <AdminInlineLoading message="Loading reviews…" />
      ) : rows.length === 0 ? (
        <AdminEmptyState
          icon={ClipboardCheck}
          title="Nothing awaiting review"
          description="Uncertain written answers from scored call simulations appear here."
        />
      ) : (
        <ul className="space-y-4">
          {rows.map((review) => (
            <li key={review.id}>
              <AdminPanel className="space-y-4 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-semibold">
                    {review.label} <span className="font-normal text-muted-foreground">· {callLabel(review.scenarioId)}</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Release {review.releaseVersion} · raised {formatUkDate(review.createdAt.slice(0, 10))} ·{" "}
                    {REASONS[review.pendingReason] ?? review.pendingReason}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Candidate wrote</p>
                  <blockquote className="mt-1 whitespace-pre-wrap border-l-2 border-primary bg-muted/30 px-3 py-2 text-sm">
                    {review.candidateEntry || "—"}
                  </blockquote>
                </div>

                {review.policy ? (
                  <details className="text-sm">
                    <summary className="cursor-pointer font-semibold">Marking policy</summary>
                    <p className="mt-2 leading-6 text-muted-foreground">{review.policy.rubric}</p>
                  </details>
                ) : null}

                {review.modelEvidence ? (
                  <div className="text-sm">
                    <p className="font-semibold">
                      Model judgement: {review.modelEvidence.disposition.replace("_", " ")}{" "}
                      <span className="font-normal text-muted-foreground">
                        (confidence {review.modelEvidence.confidence.toFixed(2)})
                      </span>
                    </p>
                    {review.modelEvidence.reason ? (
                      <p className="mt-1 text-muted-foreground">{review.modelEvidence.reason}</p>
                    ) : null}
                    <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                      {review.modelEvidence.facts.map((fact) => (
                        <li key={fact.fact} className="text-xs">
                          <span className="font-mono">{fact.fact}</span>:{" "}
                          <span className="font-semibold">{fact.status}</span>
                          {fact.quotes.length ? (
                            <span className="text-muted-foreground"> — “{fact.quotes.join("”, “")}”</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No usable model evidence for this answer.</p>
                )}

                <label className="block text-sm font-semibold">
                  Reason for decision <span className="font-normal text-muted-foreground">(optional)</span>
                  <Textarea
                    className="mt-1"
                    maxLength={1_000}
                    value={notes[review.id] ?? ""}
                    onChange={(event) => setNotes((current) => ({ ...current, [review.id]: event.target.value }))}
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={decidingId === review.id} onClick={() => void decide(review, "accept")}>
                    Accept answer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={decidingId === review.id}
                    onClick={() => void decide(review, "reject")}
                  >
                    Reject answer
                  </Button>
                </div>
              </AdminPanel>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
