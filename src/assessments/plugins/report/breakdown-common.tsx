"use client";

import {
  portalResultBandClass,
  portalResultFailClass,
  portalResultPassClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import { BreakdownSection, BreakdownStatTile } from "./breakdown-ui";

/**
 * Pieces shared by every assessment breakdown. Each assessment keeps its own
 * file so its evidence can be presented on its own terms; only the parts that
 * genuinely mean the same thing everywhere live here.
 */

export type Competency = {
  id: string;
  label: string;
  weight: number;
  score: number;
};

export type CriticalFlag = {
  id: string;
  scenarioId: string;
  label: string;
  category?: string;
  severity?: "minor" | "moderate" | "material";
};

export function asCompetencies(value: unknown): Competency[] {
  return Array.isArray(value) ? (value as Competency[]) : [];
}

export function asFlags(value: unknown): CriticalFlag[] {
  return Array.isArray(value) ? (value as CriticalFlag[]) : [];
}

export function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Rounded value with an optional suffix, or an em dash when absent. */
export function roundOrDash(value: unknown, suffix = ""): string {
  const parsed = numberOrNull(value);
  return parsed === null ? "—" : `${Math.round(parsed)}${suffix}`;
}

export function formatDuration(seconds: unknown): string {
  const parsed = numberOrNull(seconds);
  if (parsed === null || parsed <= 0) return "—";
  const minutes = Math.floor(parsed / 60);
  return minutes >= 1 ? `${minutes} min` : `${Math.round(parsed)} sec`;
}

/**
 * Score, configured standard and met/not-met, with an optional band. Shown at
 * the top of every breakdown so the headline reads the same way whichever
 * assessment a hiring manager opens.
 */
export function StandardHeader({
  metrics,
  bandLabel,
}: {
  metrics: Record<string, unknown>;
  bandLabel?: string | null;
}) {
  const overallScore = Number(metrics.overallScore ?? 0);
  const threshold = Number(metrics.configuredThreshold ?? 70);
  const meetsStandard = metrics.meetsConfiguredStandard === true;

  return (
    <div
      className={cn(
        "grid gap-3 sm:grid-cols-3",
        bandLabel ? "lg:grid-cols-4" : undefined,
      )}
    >
      <BreakdownStatTile label="Overall score" value={Math.round(overallScore)} suffix="%" />
      <BreakdownStatTile label="Assessment pass rate" value={threshold} suffix="%" />
      <BreakdownStatTile
        label="Assessment standard"
        value={meetsStandard ? "MET" : "NOT MET"}
        valueClassName={meetsStandard ? portalResultPassClass : portalResultFailClass}
      />
      {bandLabel ? (
        <BreakdownStatTile
          label="Performance band"
          value={bandLabel}
          valueClassName={cn("text-lg", portalResultBandClass(bandLabel))}
        />
      ) : null}
    </div>
  );
}

const SEVERITY_TONE: Record<string, string> = {
  material: "border-destructive bg-destructive/10",
  moderate: "border-amber-500 bg-amber-500/10",
  minor: "border-muted-foreground/50 bg-muted/40",
};

export function CriticalGates({ flags }: { flags: CriticalFlag[] }) {
  return (
    <BreakdownSection title="Critical / risk flags">
      {flags.length ? (
        <ul className="space-y-2">
          {flags.map((flag, index) => (
            <li
              key={`${flag.scenarioId}-${flag.id}-${index}`}
              className={cn(
                "border-l-4 p-3 text-sm text-foreground",
                SEVERITY_TONE[flag.severity ?? "moderate"] ?? SEVERITY_TONE.moderate,
              )}
            >
              <div className="flex flex-wrap items-baseline gap-x-2">
                <strong>{flag.scenarioId}</strong>
                {flag.severity ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {flag.severity}
                    {flag.category ? ` · ${flag.category}` : ""}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5">{flag.label}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No critical flags recorded.</p>
      )}
    </BreakdownSection>
  );
}
