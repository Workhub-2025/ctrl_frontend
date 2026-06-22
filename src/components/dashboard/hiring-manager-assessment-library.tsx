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
} from "@/components/ui/dialog";
import {
  PlayCircle,
} from "lucide-react";
import { useState } from "react";
import { getAssessmentCatalogueIcon } from "@/assessments/plugins/display";
import {
  DashboardInfoCard,
  dashboardInfoPillClassName,
} from "@/components/dashboard/dashboard-info-card";
import type { HiringManagerAssessment } from "@/services/hiring-manager-assessments.service";
import {
  PortalDetailHeader,
  portalDetailDialogContentClass,
} from "@/components/dashboard/portal/portal-dialog-ui";
import {
  portalAlertInfoClass,
  portalBadgeClass,
  portalIconWrapLgClass,
  portalLabelClass,
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
        <DialogContent className={cn(portalDetailDialogContentClass, "max-w-3xl")}>
          {selected ? (
            <>
              <div className="relative z-10 shrink-0 px-6 pb-5 pt-6">
                <PortalDetailHeader
                  layout="dialog"
                  eyebrow="Assessment library"
                  title={selected.title}
                  icon={getAssessmentCatalogueIcon(selected.slug)}
                  onClose={() => setSelected(null)}
                  closeLabel="Close assessment details"
                  badges={
                    <>
                      <Badge className={cn("pointer-events-none rounded-md border-none px-2 py-0.5 text-[10px] font-semibold", portalBadgeClass)}>
                        {selected.duration}
                      </Badge>
                      <Badge className={cn("pointer-events-none rounded-md border-none px-2 py-0.5 text-[10px] font-semibold", portalBadgeClass)}>
                        {selected.slug}
                      </Badge>
                    </>
                  }
                  metadata={
                    <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      {selected.summary}
                    </p>
                  }
                />
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
