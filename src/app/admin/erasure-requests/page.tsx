"use client";

import { useCallback, useState } from "react";
import { RefreshCw } from "lucide-react";
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
};

type ErasureQueueResponse = {
  data: ErasureQueueItem[];
};

export default function AdminErasureRequestsPage() {
  const [completingId, setCompletingId] = useState<string | null>(null);
  const { data: payload, error, loading, refetch } = useAdminResource<ErasureQueueResponse>(
    "admin:erasure-requests",
    "/api/admin/erasure-requests",
    { data: [] }
  );
  const rows = payload.data ?? [];

  const handleComplete = useCallback(
    async (userDocumentId: string) => {
      setCompletingId(userDocumentId);
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
          title: "Erasure completed",
          description: body?.data?.message ?? "User identifiers removed and account blocked.",
        });
        invalidateAdminResource("admin:erasure-requests");
        await refetch();
      } catch (completeError) {
        toast({
          title: "Could not complete erasure",
          description:
            completeError instanceof Error ? completeError.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setCompletingId(null);
      }
    },
    [refetch]
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Data erasure queue"
        description="Organisation-linked accounts that requested deletion. Complete after manual review."
        action={
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}

      <p className="text-sm text-muted-foreground">
        Candidate self-service erasures are processed automatically. Only pending client, hiring
        manager, and admin requests appear here.
      </p>

      <AdminTableShell>
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading pending requests…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No pending erasure requests.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Requested</TableHead>
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
                  </TableCell>
                  <TableCell>{row.roleName}</TableCell>
                  <TableCell>{row.clientName ?? "—"}</TableCell>
                  <TableCell>
                    {row.erasureRequestedAt
                      ? formatUkDate(row.erasureRequestedAt.slice(0, 10))
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={completingId === row.documentId}
                      onClick={() => void handleComplete(row.documentId)}
                    >
                      {completingId === row.documentId ? "Processing…" : "Complete erasure"}
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
