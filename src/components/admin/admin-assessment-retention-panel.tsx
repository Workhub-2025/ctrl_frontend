"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AdminPanel, AdminSectionHeader } from "@/components/admin/admin-portal-ui";
import {
  PLATFORM_DEFAULT_RETENTION_MONTHS,
  formatRetentionPeriod,
  resolveEffectiveRetentionMonths,
} from "@/lib/legal/retention-format";

const MIN_RETENTION_MONTHS = 1;
const MAX_RETENTION_MONTHS = 120;

export function AdminAssessmentRetentionPanel({
  clientId,
  configuredMonths,
  onCompleted,
}: {
  clientId: string;
  configuredMonths: number | null;
  onCompleted: () => void | Promise<void>;
}) {
  const [usePlatformDefault, setUsePlatformDefault] = useState(configuredMonths === null);
  const [monthsInput, setMonthsInput] = useState(
    String(configuredMonths ?? PLATFORM_DEFAULT_RETENTION_MONTHS),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setUsePlatformDefault(configuredMonths === null);
    setMonthsInput(String(configuredMonths ?? PLATFORM_DEFAULT_RETENTION_MONTHS));
    setError(null);
    setNotice(null);
  }, [clientId, configuredMonths]);

  const parsedMonths = Number.parseInt(monthsInput, 10);
  const effectiveMonths = useMemo(
    () => resolveEffectiveRetentionMonths(usePlatformDefault ? null : parsedMonths),
    [parsedMonths, usePlatformDefault],
  );

  const canSave = useMemo(() => {
    if (usePlatformDefault) {
      return configuredMonths !== null;
    }
    if (!Number.isInteger(parsedMonths)) return false;
    if (parsedMonths < MIN_RETENTION_MONTHS || parsedMonths > MAX_RETENTION_MONTHS) return false;
    return parsedMonths !== configuredMonths;
  }, [configuredMonths, parsedMonths, usePlatformDefault]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const assessmentDataRetentionMonths = usePlatformDefault
        ? null
        : parsedMonths;

      if (!usePlatformDefault) {
        if (!Number.isInteger(parsedMonths)) {
          throw new Error("Retention period must be a whole number of months");
        }
        if (parsedMonths < MIN_RETENTION_MONTHS || parsedMonths > MAX_RETENTION_MONTHS) {
          throw new Error(
            `Retention period must be between ${MIN_RETENTION_MONTHS} and ${MAX_RETENTION_MONTHS} months`,
          );
        }
      }

      const response = await fetch(`/api/admin/clients/${encodeURIComponent(clientId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract: { assessmentDataRetentionMonths },
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((body as { error?: string }).error || "Retention settings could not be saved");
      }

      setNotice("Assessment data retention updated for this contract.");
      await onCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retention settings could not be saved");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPanel className="space-y-5">
      <AdminSectionHeader
        title="Assessment data retention"
        description="How long completed candidate assessment data is kept before automated purge. Applies per contract; enforcement runs weekly."
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{notice}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Platform default
          </p>
          <p className="text-sm font-medium text-foreground">
            {formatRetentionPeriod(PLATFORM_DEFAULT_RETENTION_MONTHS)} ({PLATFORM_DEFAULT_RETENTION_MONTHS} months)
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Effective for this client
          </p>
          <p className="text-sm font-medium text-foreground">
            {formatRetentionPeriod(effectiveMonths)} ({effectiveMonths} months)
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 p-4 dark:border-white/10">
        <div className="space-y-1">
          <Label htmlFor="use-platform-retention" className="text-sm font-semibold text-foreground">
            Use platform default
          </Label>
          <p className="text-xs text-muted-foreground">
            Turn off to set a custom retention period on this contract (1–120 months).
          </p>
        </div>
        <Switch
          id="use-platform-retention"
          checked={usePlatformDefault}
          onCheckedChange={(checked) => {
            setUsePlatformDefault(checked);
            if (!checked && !Number.isInteger(parsedMonths)) {
              setMonthsInput(String(PLATFORM_DEFAULT_RETENTION_MONTHS));
            }
          }}
        />
      </div>

      {!usePlatformDefault ? (
        <div className="max-w-xs space-y-2">
          <Label htmlFor="retention-months">Custom retention (months)</Label>
          <Input
            id="retention-months"
            type="number"
            min={MIN_RETENTION_MONTHS}
            max={MAX_RETENTION_MONTHS}
            value={monthsInput}
            onChange={(event) => setMonthsInput(event.target.value)}
            className="rounded-xl"
          />
          <p className="text-xs text-muted-foreground">
            {Number.isInteger(parsedMonths) && parsedMonths >= MIN_RETENTION_MONTHS
              ? `Approximately ${formatRetentionPeriod(parsedMonths)} from session completion.`
              : "Enter a whole number between 1 and 120."}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          size="sm"
          className="h-[34px] rounded-xl gap-2"
          disabled={!canSave || saving}
          onClick={() => void handleSave()}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save retention
        </Button>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Purge removes candidate session identifiers, raw assessment payloads, and attempt records.
        Anonymised audit metadata may remain. Candidate user accounts are not deleted automatically.
      </p>
    </AdminPanel>
  );
}
