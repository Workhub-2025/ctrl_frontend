"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Library } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getAssessmentCatalogueIcon } from "@/assessments/plugins/display";
import { AssessmentPremiumBadge } from "@/components/dashboard/assessment-premium-badge";
import { AssessmentVersionPreview } from "@/components/dashboard/assessment-version-preview";
import {
  PortalEmptyState,
  PortalPanel,
} from "@/components/dashboard/portal/portal-ui";
import {
  PortalDetailHeader,
  portalDetailDialogContentClass,
} from "@/components/dashboard/portal/portal-dialog-ui";
import {
  portalBadgeClass,
  portalIconWrapLgClass,
  portalInputClass,
  portalLabelClass,
  portalPanelNestedClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { dashboardInfoPillClassName } from "@/components/dashboard/dashboard-info-card";
import { preferredAssessmentReleaseVersion } from "@/lib/assessment-platform-registry";
import type { HiringManagerAssessment } from "@/services/hiring-manager-assessments.service";
import { cn } from "@/lib/utils";

type HiringManagerAssessmentLibraryProps = {
  assessments: HiringManagerAssessment[];
};

function defaultVersionFor(assessment: HiringManagerAssessment): string {
  const preferred = preferredAssessmentReleaseVersion(assessment.slug);
  const versions = assessment.availableVersions;
  if (versions.some((entry) => entry.version === preferred)) {
    return preferred;
  }
  return versions[0]?.version ?? preferred;
}

export function HiringManagerAssessmentLibrary({
  assessments,
}: HiringManagerAssessmentLibraryProps) {
  const [selected, setSelected] = useState<HiringManagerAssessment | null>(null);
  const [previewVersion, setPreviewVersion] = useState<string>("");

  useEffect(() => {
    if (!selected) {
      setPreviewVersion("");
      return;
    }
    setPreviewVersion(defaultVersionFor(selected));
  }, [selected]);

  const selectedVersionOption = useMemo(() => {
    if (!selected) return null;
    return (
      selected.availableVersions.find((entry) => entry.version === previewVersion) ??
      selected.availableVersions[0] ??
      null
    );
  }, [previewVersion, selected]);

  if (assessments.length === 0) {
    return (
      <PortalEmptyState
        icon={Library}
        title="No assessments available"
        description="Active assessments from the platform catalogue will appear here once enabled for your organisation."
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        {assessments.map((assessment) => {
          const Icon = getAssessmentCatalogueIcon(assessment.slug);
          return (
            <PortalPanel key={assessment.id} className="space-y-4">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <span className={portalIconWrapLgClass} aria-hidden="true">
                  <Icon className="h-5 w-5" />
                </span>
                <Badge
                  className={cn(
                    "pointer-events-none rounded-md border-none px-2 py-0.5 text-[10px] font-semibold",
                    portalBadgeClass,
                  )}
                >
                  {assessment.duration}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="break-words text-lg font-semibold leading-snug tracking-tight text-foreground">
                    {assessment.title}
                  </h3>
                  <AssessmentPremiumBadge entitlementTier={assessment.entitlementTier} />
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {assessment.summary}
                </p>
              </div>
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
                View details
              </Button>
            </PortalPanel>
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
                      <AssessmentPremiumBadge entitlementTier={selected.entitlementTier} />
                      <Badge
                        className={cn(
                          "pointer-events-none rounded-md border-none px-2 py-0.5 text-[10px] font-semibold",
                          portalBadgeClass,
                        )}
                      >
                        {selected.duration}
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
                <div className="space-y-2">
                  <p className={portalLabelClass}>Available releases</p>
                  {selected.availableVersions.length > 0 ? (
                    <Select value={previewVersion} onValueChange={setPreviewVersion}>
                      <SelectTrigger className={cn(portalInputClass, "h-10 text-sm")}>
                        <SelectValue placeholder="Select a release" />
                      </SelectTrigger>
                      <SelectContent>
                        {selected.availableVersions.map((version) => (
                          <SelectItem key={version.version} value={version.version}>
                            {version.title || `v${version.version}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No selectable releases are published for this module yet.
                    </p>
                  )}
                </div>

                <AssessmentVersionPreview
                  slug={selected.slug}
                  version={selectedVersionOption}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={cn(portalPanelNestedClass, "p-4")}>
                    <p className={portalLabelClass}>Measured skills</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {selected.skills.map((skill) => (
                        <Badge
                          key={skill}
                          className={cn(
                            "pointer-events-none rounded-md border-none px-2 py-0.5 text-[10px] font-semibold",
                            portalBadgeClass,
                          )}
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className={cn(portalPanelNestedClass, "p-4")}>
                    <p className={portalLabelClass}>Why it matters</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {selected.whyItMatters}
                    </p>
                  </div>
                </div>

                <div className={cn(portalPanelNestedClass, "grid gap-2 p-4 text-xs leading-relaxed text-muted-foreground")}>
                  <p>
                    Passing score:{" "}
                    <span className="font-semibold text-foreground">
                      {selected.passingScore === null
                        ? "Configured per campaign"
                        : `${selected.passingScore}%`}
                    </span>
                  </p>
                  <p>
                    Module slug:{" "}
                    <span className="font-mono font-semibold text-foreground">
                      {selected.slug}
                    </span>
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
