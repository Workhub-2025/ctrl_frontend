"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageHeader, AdminTableShell } from "@/components/admin/admin-portal-ui";
import { AssessmentAbandonedActions } from "@/components/dashboard/assessment-abandoned-actions";
import { portalBadgeClass } from "@/components/dashboard/portal/portal-ui";
import { formatAbandonSnapshotSummary } from "@/lib/assessment-abandon-summary";
import { formatAssessmentSlugLabel } from "@/lib/assessment-result-status";
import {
  AssessmentAttemptService,
  type CandidateAssessmentAttempt,
} from "@/services/assessment-attempt.service";

type AssessmentRecoveryWorkspaceProps = {
  title?: string;
  description?: string;
  scope?: "admin" | "portal";
  showSearch?: boolean;
};

function relativeTime(dateStr?: string | null): string {
  if (!dateStr) return "Unknown";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function candidateLabel(attempt: CandidateAssessmentAttempt): string {
  const user = attempt.users_permissions_user;
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  return name || user?.email || attempt.candidateSession?.candidateCode || "Candidate";
}

export function AssessmentRecoveryWorkspace({
  title = "Assessment recovery",
  description = "Review abandoned assessment snapshots and unlock candidates to resume or restart.",
  scope = "portal",
  showSearch = false,
}: AssessmentRecoveryWorkspaceProps) {
  const [attempts, setAttempts] = useState<CandidateAssessmentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadAttempts = useCallback(async (query?: string) => {
    try {
      setLoading(true);
      setError(null);
      const rows =
        showSearch && query?.trim()
          ? await AssessmentAttemptService.searchAbandonedForAdmin(query.trim())
          : await AssessmentAttemptService.listRecoveryAttempts(scope === "admin" ? "admin" : "portal");
      setAttempts(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load abandoned attempts");
    } finally {
      setLoading(false);
    }
  }, [scope, showSearch]);

  useEffect(() => {
    void loadAttempts();
  }, [loadAttempts]);

  const handleSearch = () => {
    void loadAttempts(searchQuery);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={title}
        description={description}
        action={
          <Button variant="outline" size="sm" onClick={() => void loadAttempts(searchQuery)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {showSearch ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search email, candidate code, or session ID"
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSearch();
            }}
          />
          <Button variant="secondary" onClick={handleSearch}>
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <AdminTableShell>
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : attempts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <ShieldAlert className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No abandoned attempts right now.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Candidate</th>
                  <th className="px-4 py-3 font-medium">Assessment</th>
                  <th className="px-4 py-3 font-medium">Snapshot</th>
                  <th className="px-4 py-3 font-medium">Campaign</th>
                  <th className="px-4 py-3 font-medium">Abandoned</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((attempt) => {
                  const candidateName = candidateLabel(attempt);
                  const candidateEmail = attempt.users_permissions_user?.email ?? null;
                  const campaignName = attempt.candidateSession?.campaign?.name ?? "Unknown campaign";
                  const candidateSessionDocumentId =
                    attempt.candidateSessionDocumentId ?? attempt.candidateSession?.documentId ?? "";
                  const assessmentSlug = attempt.assessmentSlug ?? "";
                  const assessmentLabel = formatAssessmentSlugLabel(assessmentSlug || "unknown");

                  return (
                    <tr
                      key={attempt.documentId ?? `${candidateSessionDocumentId}-${assessmentSlug}`}
                      className="border-b border-border/40 last:border-0"
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium text-foreground">{candidateName}</div>
                        <div className="text-xs text-muted-foreground">
                          {candidateEmail ?? "No email"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {assessmentLabel}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {formatAbandonSnapshotSummary(
                          assessmentSlug,
                          attempt.snapshot,
                          attempt.contentVersion
                        )}
                        {attempt.abandonReason ? (
                          <div className="mt-1">
                            <Badge className={portalBadgeClass}>
                              {attempt.abandonReason.replace(/_/g, " ")}
                            </Badge>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {campaignName}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {relativeTime(attempt.abandonedAt ?? attempt.lastHeartbeatAt)}
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={portalBadgeClass}>
                          {attempt.attemptStatus === "abandoned_locked"
                            ? "Abandoned"
                            : attempt.attemptStatus?.replace(/_/g, " ") ?? "Unknown"}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        {candidateSessionDocumentId && assessmentSlug ? (
                          <AssessmentAbandonedActions
                            candidateSessionDocumentId={candidateSessionDocumentId}
                            assessmentSlug={assessmentSlug}
                            assessmentLabel={assessmentLabel}
                            candidateName={candidateName}
                            candidateEmail={candidateEmail}
                            campaignName={campaignName}
                            snapshot={attempt.snapshot}
                            contentVersion={attempt.contentVersion}
                            abandonReason={attempt.abandonReason}
                            abandonedAt={attempt.abandonedAt}
                            attemptDocumentId={attempt.documentId}
                            attemptStatus={attempt.attemptStatus}
                            compact
                            onRecovered={() => void loadAttempts(searchQuery)}
                            recoverFn={
                              scope === "admin"
                                ? AssessmentAttemptService.adminRecover.bind(AssessmentAttemptService)
                                : undefined
                            }
                            versionsUrl={scope === "admin" ? "/api/admin/assessment-versions" : undefined}
                          />
                        ) : (
                          <Badge variant="outline" className="rounded-lg text-[10px] font-semibold text-muted-foreground">
                            Missing session
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminTableShell>

    </div>
  );
}
