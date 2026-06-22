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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PlayCircle,
  X,
} from "lucide-react";
import { useState } from "react";
import { getAssessmentCatalogueIcon } from "@/assessments/plugins/display";
import {
  DashboardInfoCard,
  dashboardInfoPillClassName,
} from "@/components/dashboard/dashboard-info-card";
import type { HiringManagerAssessment } from "@/services/hiring-manager-assessments.service";
import {
  portalAlertInfoClass,
  portalBadgeClass,
  portalDialogShellClass,
  portalIconWrapLgClass,
  portalLabelClass,
  portalPageHeaderClass,
  portalPanelClass,
  portalPanelNestedClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";

type HiringManagerAssessmentLibraryProps = {
  assessments: HiringManagerAssessment[];
};

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
          const Icon = getAssessmentCatalogueIcon(assessment.slug);
          return (
            <DashboardInfoCard key={assessment.id}>
              <CardHeader className="space-y-3 pb-3 pl-6">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <span className={portalIconWrapLgClass} aria-hidden="true">
                    <Icon className="h-5 w-5" />
                  </span>
                  <Badge
                    className={cn(
                      "pointer-events-none rounded-md border-none px-2 py-0.5 text-[10px] font-semibold",
                      portalBadgeClass
                    )}
                  >
                    {assessment.duration}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <CardTitle className="break-words text-lg font-semibold leading-snug tracking-tight text-foreground">
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
                    <span key={skill} className={dashboardInfoPillClassName}>
                      {skill}
                    </span>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg px-4 text-xs font-semibold"
                  onClick={() => setSelected(assessment)}
                >
                  View more
                </Button>
              </CardContent>
            </DashboardInfoCard>
          );
        })}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent
          className={cn(
            portalDialogShellClass,
            "flex max-h-[min(86dvh,900px)] max-w-3xl flex-col gap-0 overflow-hidden p-0 [&>button]:hidden"
          )}
        >
          {selected ? (
            <>
              <div className="pointer-events-none absolute -left-24 -top-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

              <div className="relative z-10 shrink-0 px-6 pb-5 pt-6">
                <DialogHeader className={cn(portalPageHeaderClass, "mb-0 border-b-0 pb-0 text-left")}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3.5">
                      {(() => {
                        const Icon = getAssessmentCatalogueIcon(selected.slug);
                        return (
                          <span className={cn(portalIconWrapLgClass, "mt-0.5")} aria-hidden="true">
                            <Icon className="h-5 w-5" />
                          </span>
                        );
                      })()}
                      <div className="min-w-0 space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                          Assessment library
                        </p>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <DialogTitle className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
                            {selected.title}
                          </DialogTitle>
                          <Badge
                            className={cn(
                              "pointer-events-none rounded-md border-none px-2 py-0.5 text-[10px] font-semibold",
                              portalBadgeClass
                            )}
                          >
                            {selected.duration}
                          </Badge>
                          <Badge
                            className={cn(
                              "pointer-events-none rounded-md border-none px-2 py-0.5 text-[10px] font-semibold",
                              portalBadgeClass
                            )}
                          >
                            {selected.slug}
                          </Badge>
                        </div>
                        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                          {selected.summary}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/10 dark:hover:text-white"
                      aria-label="Close assessment details"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </DialogHeader>
              </div>

              <div className="relative z-10 flex-1 space-y-5 overflow-y-auto px-6 pb-6">
                <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className={cn(portalPanelClass, "p-4")}>
                    <div className="mb-3 flex items-center gap-2">
                      <PlayCircle className="h-4 w-4 text-primary" />
                      <p className={portalLabelClass}>Video demo</p>
                    </div>
                    <div className="flex min-h-44 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-center text-xs leading-relaxed text-muted-foreground dark:border-white/10 dark:bg-white/[0.03]">
                      {selected.videoLabel}
                      <br />
                      Video module placeholder for the assessment walkthrough.
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className={cn(portalPanelNestedClass, "p-4")}>
                      <p className={portalLabelClass}>What Strapi provides</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {selected.skills.map((skill) => (
                          <Badge
                            key={skill}
                            className={cn(
                              "pointer-events-none rounded-md border-none px-2 py-0.5 text-[10px] font-semibold",
                              portalBadgeClass
                            )}
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-4 grid gap-2 border-t border-border/50 pt-3 text-xs leading-relaxed text-muted-foreground dark:border-white/10">
                        <p>
                          Slug:{" "}
                          <span className="font-mono font-semibold text-foreground">{selected.slug}</span>
                        </p>
                        <p>
                          Attempts:{" "}
                          <span className="font-semibold text-foreground">
                            {selected.maxAttempts ?? "Configured by backend"}
                          </span>
                        </p>
                        <p>
                          Passing score:{" "}
                          <span className="font-semibold text-foreground">
                            {selected.passingScore === null
                              ? "Configured by backend"
                              : `${selected.passingScore}%`}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className={cn(portalPanelNestedClass, "p-4")}>
                      <p className={portalLabelClass}>Why it matters</p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {selected.whyItMatters}
                      </p>
                    </div>

                    <div className={cn(portalAlertInfoClass, "text-xs leading-relaxed")}>
                      Remote and premium delivery can be permission-locked later without changing
                      the assessment definition coming from Strapi.
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
