"use client";

import { useState } from "react";
import { Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-portal-ui";

type SyncResult = {
  synced?: number;
  slugs?: string[];
  message?: string;
};

export function PlatformCatalogueSyncPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);

  const runSync = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/admin/assessment/platform-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const body = (await response.json().catch(() => null)) as {
        data?: SyncResult;
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Platform catalogue sync failed");
      }

      setResult(body?.data ?? null);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Platform catalogue sync failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card p-5">
      <AdminPageHeader
        title="Platform catalogue sync"
        description="Re-seed assessment catalogue and content banks from repo JSON. Clears portal catalogue caches on success."
        action={
          <Button onClick={() => void runSync()} disabled={loading} size="sm">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Database className="mr-2 h-4 w-4" />
            )}
            Sync from repo
          </Button>
        }
      />

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {result ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-foreground">
          <p className="font-medium">Catalogue synced successfully</p>
          {typeof result.synced === "number" ? (
            <p className="mt-1 text-muted-foreground">{result.synced} catalogue rows updated.</p>
          ) : null}
          {result.message ? (
            <p className="mt-1 text-muted-foreground">{result.message}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
