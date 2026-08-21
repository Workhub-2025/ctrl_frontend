"use client";

import { useCallback, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminResource, invalidateAdminResource } from "@/lib/admin-resource-cache";
import {
  AdminAlert,
  AdminEmptyState,
  AdminInlineLoading,
  AdminPageHeader,
  AdminTableShell,
} from "@/components/admin/admin-portal-ui";
import { toast } from "@/hooks/use-toast";
import { formatUkDate } from "@/lib/legal/uk-compliance";

type ErasureQueueItem = {
  documentId: string;
  email: string;
  firstName: string;
  lastName: string;
  roleType: string;
  roleName: string;
  clientName: string | null;
  erasureRequestedAt: string | null;
  erasureStatus: string;
  erasureStage?: string | null;
  erasureEvidenceHash?: string | null;
  erasureLastError?: string | null;
};

type ErasureQueueResponse = {
  data: ErasureQueueItem[];
};

export default function AdminErasureRequestsPage() {
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const { data: payload, error, loading, refetch } = useAdminResource<ErasureQueueResponse>(
    "admin:erasure-requests",
    "/api/admin/erasure-requests",
    { data: [] }
  );
  const rows = payload.data ?? [];

  const handleAdvance = useCallback(
    async (userDocumentId: string) => {
      const confirmed = window.confirm(
        "Advance this erasure through the staged orchestrator? This does not one-shot fulfill — it runs or retries the next stages and records evidence.",
      );
      if (!confirmed) return;
      setAdvancingId(userDocumentId);
      try {
        const response = await fetch(
          `/api/admin/erasure-requests/${encodeURIComponent(userDocumentId)}/complete`,
          { method: "POST", credentials: "same-origin" }
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(typeof body.error === "string" ? body.error : "Erasure failed");
        }
        toast({
          title: "Erasure stage advanced",
          description:
            body?.data?.message ??
            `Stage: ${body?.data?.erasureStage ?? "updated"}`,
        });
        invalidateAdminResource("admin:erasure-requests");
        await refetch();
      } catch (completeError) {
        toast({
          title: "Could not advance erasure",
          description:
            completeError instanceof Error ? completeError.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setAdvancingId(null);
      }
    },
    [refetch]
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Data erasure queue"
        description="Organisation-linked accounts that requested deletion. Advance stages after manual review — fulfilment requires verified orchestrator evidence."
        action={
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "motion-safe:animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}

      <p className="text-sm text-muted-foreground">
        Candidate self-service erasures are processed automatically. Only pending client, hiring
        manager, and admin requests appear here. Stages: requested → holds_checked → auth_disabled →
        memberships_released → domains_pseudonymized → verified → fulfilled.
      </p>

      <AdminTableShell>
        {loading ? (
          <AdminInlineLoading message="Loading pending requests…" />
        ) : rows.length === 0 ? (
          <AdminEmptyState
            icon={ShieldCheck}
            title="No pending erasure requests"
            description="Manual review items appear here when organisation-linked users request deletion."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.documentId}>
                  <TableCell>
                    <div className="font-medium">
                      {row.firstName} {row.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">{row.email}</div>
                    {row.erasureLastError ? (
                      <div className="mt-1 text-xs text-destructive">{row.erasureLastError}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>{row.roleName}</TableCell>
                  <TableCell>{row.clientName ?? "—"}</TableCell>
                  <TableCell>
                    {row.erasureRequestedAt
                      ? formatUkDate(row.erasureRequestedAt.slice(0, 10))
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">
                      {row.erasureStage ?? row.erasureStatus}
                    </div>
                    {row.erasureEvidenceHash ? (
                      <div className="max-w-[10rem] truncate text-xs text-muted-foreground">
                        {row.erasureEvidenceHash}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={advancingId === row.documentId}
                      onClick={() => void handleAdvance(row.documentId)}
                    >
                      {advancingId === row.documentId
                        ? "Advancing…"
                        : row.erasureStage === "failed"
                          ? "Retry orchestrator"
                          : "Advance / retry"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AdminTableShell>
    </div>
  );
}
