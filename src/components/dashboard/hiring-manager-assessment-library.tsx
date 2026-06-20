"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Brain,
  BrainCircuit,
  Headphones,
  PlayCircle,
  SlidersHorizontal,
  TimerReset,
} from "lucide-react";
import { useState } from "react";
import {
  DashboardInfoCard,
  dashboardInfoPillClassName,
} from "@/components/dashboard/dashboard-info-card";
import type { HiringManagerAssessment } from "@/services/hiring-manager-assessments.service";
import { portalAlertInfoClass, portalPanelClass } from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";

type HiringManagerAssessmentLibraryProps = {
  assessments: HiringManagerAssessment[];
};

const iconByKey = {
  typing: TimerReset,
  "call-simulation": Headphones,
  "situational-judgement": SlidersHorizontal,
  prioritisation: BrainCircuit,
  "short-term-memory": Brain,
  default: BrainCircuit,
} satisfies Record<HiringManagerAssessment["iconKey"], typeof BrainCircuit>;

export function HiringManagerAssessmentLibrary({
  assessments,
}: HiringManagerAssessmentLibraryProps) {
  const [selected, setSelected] = useState<HiringManagerAssessment | null>(null);

  if (assessments.length === 0) {
    return (
      <DashboardInfoCard interactive={false} className="border-dashed">
        <CardContent className="p-6 text-sm leading-6 text-muted-foreground">
          No active assessments are currently available from Strapi. Once Nelson
          enables or seeds the assessment records, they will appear here
          automatically.
        </CardContent>
      </DashboardInfoCard>
    );
  }

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        {assessments.map((assessment) => {
          const Icon = iconByKey[assessment.iconKey] ?? BrainCircuit;
          return (
            <DashboardInfoCard
              key={assessment.id}
            >
              <CardHeader className="space-y-3 pb-3 pl-6">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Badge variant="outline" className="rounded-lg border-border/55 bg-muted/40 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground hover:bg-muted/40 dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.04]">
                      {assessment.duration}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <CardTitle className="break-words text-lg font-bold leading-snug text-foreground tracking-tight">
                    {assessment.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                    {assessment.summary}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pl-6">
                <div className="flex flex-wrap gap-1.5">
                  {assessment.skills.map((skill) => (
                    <span
                      key={skill}
                      className={dashboardInfoPillClassName}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="h-9 rounded-xl border-border bg-background/50 px-4 text-xs font-semibold text-foreground transition-colors hover:!bg-muted hover:!text-foreground hover:border-primary/30 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-200 dark:hover:!bg-white/[0.08] dark:hover:!text-white"
                  onClick={() => setSelected(assessment)}
                >
                  View more
                </Button>
              </CardContent>
            </DashboardInfoCard>
          );
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl p-0 text-white overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#080c16]/95 shadow-2xl backdrop-blur-xl">
          {selected && (
            <div className="overflow-hidden">
              <div className={cn(portalPanelClass, "border-b border-white/5 p-6")}>
                <DialogHeader className="space-y-3 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-lg border-primary/20 bg-primary/15 text-xs font-bold text-primary px-2.5 py-0.5">
                      {selected.duration}
                    </Badge>
                    <Badge variant="outline" className="rounded-lg border-white/10 bg-white/5 text-xs font-semibold text-slate-300 hover:bg-white/5 px-2.5 py-0.5">
                      {selected.slug}
                    </Badge>
                  </div>
                  <DialogTitle className="text-2xl font-black text-white tracking-tight">
                    {selected.title}
                  </DialogTitle>
                  <DialogDescription className="max-w-2xl text-sm leading-relaxed text-slate-300">
                    {selected.summary}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="grid gap-5 p-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-5">
                  <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4">
                    <div className="mb-3 flex items-center gap-2 text-slate-200">
                      <PlayCircle className="h-4 w-4 text-primary" />
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Video demo
                      </p>
                    </div>
                    <div className="flex min-h-44 items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#04070d]/50 p-4 text-center text-xs leading-relaxed text-slate-400">
                      {selected.videoLabel}
                      <br />
                      Video module placeholder for the assessment walkthrough.
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      What Strapi provides
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {selected.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1 text-xs text-slate-300 font-semibold"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-2 text-xs leading-relaxed text-slate-400 border-t border-white/5 pt-3">
                      <p>Slug: <span className="font-mono font-bold text-white">{selected.slug}</span></p>
                      <p>Attempts: <span className="font-bold text-white">{selected.maxAttempts ?? "Configured by backend"}</span></p>
                      <p>
                        Passing score:{" "}
                        <span className="font-bold text-white">
                          {selected.passingScore === null
                            ? "Configured by backend"
                            : `${selected.passingScore}%`}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Why it matters
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">
                      {selected.whyItMatters}
                    </p>
                  </div>
                  <div className={cn(portalAlertInfoClass, "text-xs font-semibold leading-relaxed")}>
                    Remote and premium delivery can be permission-locked later
                    without changing the assessment definition coming from Strapi.
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
