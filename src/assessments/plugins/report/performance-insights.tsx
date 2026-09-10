"use client";

import { BreakdownSection } from "./breakdown-ui";

type Insight = { id: string; kind: "strength" | "explore"; title: string; evidence: string; question?: string };

function isInsight(value: unknown): value is Insight {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.title === "string" &&
    typeof item.evidence === "string" && (item.kind === "strength" || item.kind === "explore") &&
    (item.question === undefined || typeof item.question === "string");
}

export function PerformanceInsights({ insights }: { insights: unknown }) {
  const items = Array.isArray(insights) ? insights.filter(isInsight) : [];
  if (!items.length) return (
    <BreakdownSection title="Performance insights">
      <p className="text-sm text-muted-foreground">There is not enough detailed evidence to summarise strengths and development areas for this result. Review the available scores below.</p>
    </BreakdownSection>
  );
  return (
    <section aria-label="Performance insights" className="space-y-3">
      <p className="text-xs text-muted-foreground">These observations describe performance in this assessment. Use the follow-up questions to explore how the candidate approaches similar tasks.</p>
      <div className="grid items-start gap-3 md:grid-cols-2">
        {(["strength", "explore"] as const).map((kind) => {
          const entries = items.filter((item) => item.kind === kind);
          return (
            <BreakdownSection key={kind} title={kind === "strength" ? "Demonstrated strengths" : "Areas to explore"}>
              {entries.length ? <ul className="space-y-4">
                {entries.map((item) => <li key={item.id} className="min-w-0 space-y-1.5 break-words">
                  <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.evidence}</p>
                  {item.question ? <details className="text-sm">
                    <summary className="min-h-11 cursor-pointer rounded-sm py-3 font-medium text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">Suggested follow-up</summary>
                    <p className="pb-2 leading-relaxed text-muted-foreground">{item.question}</p>
                  </details> : null}
                </li>)}
              </ul> : <p className="text-sm text-muted-foreground">{kind === "strength" ? "No distinct strength was identified in the available evidence." : "No specific development area was identified in the available evidence."}</p>}
            </BreakdownSection>
          );
        })}
      </div>
    </section>
  );
}
