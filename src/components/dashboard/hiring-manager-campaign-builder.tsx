"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Headphones,
  Lock,
  Unlock,
  Save,
  ShieldCheck,
} from "lucide-react";
import { getAssessmentCatalogueIcon } from "@/assessments/plugins/display";
import type { HiringManagerAssessment } from "@/services/hiring-manager-assessments.service";
import { HiringManagerPortalClientService } from "@/services/hiring-manager-portal-client.service";
import {
  portalAlertErrorClass,
  portalAlertInfoClass,
  portalBadgeClass,
  portalEmptyPanelClass,
  portalHeroPanelClass,
  portalIconWrapClass,
  portalInputClass,
  portalLabelClass,
  portalPanelNestedClass,
  portalPrimaryButtonClass,
  portalAssessmentPreviewDetailsClass,
  portalSelectableCardClass,
  portalSelectableCardGroupClass,
  portalSelectableCardSelectedClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import { OptionalDateField } from "@/components/dashboard/portal/optional-datetime-fields";

interface CampaignBuilderProps {
  assessments: HiringManagerAssessment[];
  allowRemoteDelivery?: boolean;
  allowHybridDelivery?: boolean;
  mode?: "create" | "edit-stack";
  campaignId?: string;
  initialStackDraft?: {
    assessmentSlugs: string[];
    assessmentWeights: Record<string, number>;
    assessmentVersions: Record<string, string>;
    typingDifficulty: CampaignDraft["typingDifficulty"];
    prioritisationScoringMode: CampaignDraft["prioritisationScoringMode"];
    deliveryMode: CampaignDraft["deliveryMode"];
  };
}

type CreateCampaignResponse = {
  data?: unknown;
  error?: string;
};

type CampaignDraft = {
  campaignName: string;
  roleTitle: string;
  location: string;
  deliveryMode: "in_person" | "remote" | "hybrid";
  candidateVolume: string;
  startDate: string;
  notes: string;
  assessmentSlugs: string[];
  assessmentWeights: Record<string, number>;
  assessmentVersions: Record<string, string>;
  typingDifficulty: "Base" | "Intermediate" | "Extreme";
  prioritisationScoringMode: "Basic" | "Advanced";
};

const emptyDraft: CampaignDraft = {
  campaignName: "",
  roleTitle: "",
  location: "",
  deliveryMode: "in_person",
  candidateVolume: "100",
  startDate: "",
  notes: "",
  assessmentSlugs: [],
  assessmentWeights: {},
  assessmentVersions: {},
  typingDifficulty: "Base",
  prioritisationScoringMode: "Basic",
};

const DEFAULT_ASSESSMENT_VERSION = "1.0.0";

function getVersionOptions(assessment: HiringManagerAssessment) {
  return assessment.availableVersions.length > 0
    ? assessment.availableVersions
    : [{ version: DEFAULT_ASSESSMENT_VERSION, title: `v${DEFAULT_ASSESSMENT_VERSION}`, description: null }];
}

function getSelectedVersionOption(assessment: HiringManagerAssessment, selectedVersion: string) {
  return getVersionOptions(assessment).find((version) => version.version === selectedVersion)
    ?? getVersionOptions(assessment)[0];
}

function removeRecordKey<T>(record: Record<string, T>, key: string) {
  const next = { ...record };
  delete next[key];
  return next;
}

function formatTotalDuration(seconds: number): string {
  if (!seconds) {
    return "Set by backend configuration";
  }

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} hr ${remaining} min` : `${hours} hr`;
}

function VersionPreviewPanel({
  assessment,
  version,
}: {
  assessment: HiringManagerAssessment;
  version: ReturnType<typeof getSelectedVersionOption>;
}) {
  const samples = version?.previewSamples?.filter(Boolean).slice(0, 3) ?? [];
  const audioPreview = version?.audioPreview;

  if (samples.length === 0 && !audioPreview && !version?.description) {
    return (
      <details className={portalAssessmentPreviewDetailsClass}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 font-bold uppercase tracking-wider text-muted-foreground marker:hidden">
          <span className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            Quick preview
          </span>
          <span className="text-[10px] text-muted-foreground group-open:hidden">Show</span>
          <span className="hidden text-[10px] text-muted-foreground group-open:inline">Hide</span>
        </summary>
        <div className="border-t border-border/60 px-3 py-3 leading-5 dark:border-white/10">
          Preview content is not available for this version yet.
        </div>
      </details>
    );
  }

  return (
    <details className={portalAssessmentPreviewDetailsClass}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 font-bold uppercase tracking-wider text-muted-foreground marker:hidden">
        <span className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          Quick preview
        </span>
        <span className="text-[10px] text-muted-foreground group-open:hidden">Show</span>
        <span className="hidden text-[10px] text-muted-foreground group-open:inline">Hide</span>
      </summary>
      <div className="space-y-3 border-t border-border/60 p-3 dark:border-white/10">
        {version?.description ? (
          <p className="text-xs leading-5 text-muted-foreground">{version.description}</p>
        ) : null}
        {samples.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {samples.map((sample, index) => (
              <p
                key={`${assessment.slug}-${version?.version}-sample-${index}`}
                className={cn(portalPanelNestedClass, "rounded-md px-3 py-2 text-xs leading-5 text-foreground")}
              >
                {sample}
              </p>
            ))}
          </div>
        ) : null}
        {audioPreview?.src ? (
          <div className="rounded-md border border-cyan-400/20 bg-cyan-400/10 p-2.5">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-cyan-200">
              <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
              {audioPreview.label}
            </div>
            <audio
              controls
              preload="metadata"
              src={`${audioPreview.src}#t=${audioPreview.startSeconds},${audioPreview.startSeconds + audioPreview.durationSeconds}`}
              className="h-8 w-full"
            >
              Audio preview is not supported by this browser.
            </audio>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function toStartDateTime(value: string) {
  return new Date(`${value}T09:00:00`).toISOString();
}

function buildEqualWeights(slugs: string[]) {
  if (slugs.length === 0) return {};

  const baseWeight = Math.floor(100 / slugs.length);
  const remainder = 100 - baseWeight * slugs.length;

  return slugs.reduce<Record<string, number>>((weights, slug, index) => {
    weights[slug] = baseWeight + (index < remainder ? 1 : 0);
    return weights;
  }, {});
}

export function HiringManagerCampaignBuilder({
  assessments,
  allowRemoteDelivery = false,
  allowHybridDelivery = false,
  mode = "create",
  campaignId,
  initialStackDraft,
}: CampaignBuilderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditStackMode = mode === "edit-stack";
  const [draft, setDraft] = useState<CampaignDraft>(emptyDraft);
  const [lockedSlugs, setLockedSlugs] = useState<string[]>([]);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEditStackMode || !initialStackDraft) return;

    setDraft((current) => ({
      ...current,
      assessmentSlugs: initialStackDraft.assessmentSlugs,
      assessmentWeights: initialStackDraft.assessmentWeights,
      assessmentVersions: initialStackDraft.assessmentVersions,
      typingDifficulty: initialStackDraft.typingDifficulty,
      prioritisationScoringMode: initialStackDraft.prioritisationScoringMode,
      deliveryMode: initialStackDraft.deliveryMode,
    }));
  }, [initialStackDraft, isEditStackMode]);

  const selectedAssessments = useMemo(
    () =>
      assessments.filter((assessment) =>
        draft.assessmentSlugs.includes(assessment.slug)
      ),
    [assessments, draft.assessmentSlugs]
  );

  const totalDurationSeconds = selectedAssessments.reduce(
    (total, assessment) => total + (assessment.durationSeconds ?? 0),
    0
  );
  const assessmentWeightTotal = selectedAssessments.reduce(
    (total, assessment) => total + (draft.assessmentWeights[assessment.slug] ?? 0),
    0
  );

  const hasRequiredSetup = isEditStackMode
    ? selectedAssessments.length > 0 && selectedAssessments.every((assessment) => assessment.documentId)
    : draft.campaignName.trim() &&
      draft.roleTitle.trim() &&
      draft.candidateVolume.trim() &&
      draft.startDate.trim() &&
      selectedAssessments.length > 0 &&
      selectedAssessments.every((assessment) => assessment.documentId);
  const isReady = hasRequiredSetup && assessmentWeightTotal === 100;

  const updateDraft = <Key extends keyof CampaignDraft>(
    key: Key,
    value: CampaignDraft[Key]
  ) => {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
    setSavedMessage(null);
    setErrorMessage(null);
  };

  const toggleLockSlug = (slug: string) => {
    setLockedSlugs((current) => {
      const exists = current.includes(slug);
      if (exists) {
        return current.filter((item) => item !== slug);
      }
      // Enforce at least one unlocked assessment to absorb changes
      const unlockedCount = draft.assessmentSlugs.length - current.length;
      if (unlockedCount <= 1) {
        return current;
      }
      return [...current, slug];
    });
  };

  const toggleAssessment = (slug: string) => {
    setDraft((current) => {
      const exists = current.assessmentSlugs.includes(slug);
      const assessmentSlugs = exists
        ? current.assessmentSlugs.filter((item) => item !== slug)
        : [...current.assessmentSlugs, slug];

      if (exists) {
        setLockedSlugs((locked) => locked.filter((item) => item !== slug));
      }

      return {
        ...current,
        assessmentSlugs,
        assessmentWeights: buildEqualWeights(assessmentSlugs),
        assessmentVersions: exists
          ? removeRecordKey(current.assessmentVersions, slug)
          : {
              ...current.assessmentVersions,
              [slug]: DEFAULT_ASSESSMENT_VERSION,
            },
      };
    });
    setSavedMessage(null);
    setErrorMessage(null);
  };

  const updateAssessmentWeight = (slug: string, value: string) => {
    const parsed = Number.parseInt(value, 10);
    const newWeightRaw = Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, 100)) : 0;

    setDraft((current) => {
      const currentWeights = current.assessmentWeights;
      const slugs = current.assessmentSlugs;

      if (slugs.length <= 1) {
        return {
          ...current,
          assessmentWeights: slugs.reduce<Record<string, number>>((acc, s) => {
            acc[s] = 100;
            return acc;
          }, {}),
        };
      }

      // Calculate sum of other locked weights
      const otherLockedSlugs = lockedSlugs.filter((s) => s !== slug && slugs.includes(s));
      const sumLocked = otherLockedSlugs.reduce((sum, s) => sum + (currentWeights[s] ?? 0), 0);

      // Cap newWeight so it doesn't exceed 100 - sumLocked
      const newWeight = Math.min(newWeightRaw, 100 - sumLocked);

      // Other unlocked slugs that need to absorb the difference
      const otherUnlockedSlugs = slugs.filter((s) => s !== slug && !lockedSlugs.includes(s));

      if (otherUnlockedSlugs.length === 0) {
        return current;
      }

      const newWeights = { ...currentWeights };
      newWeights[slug] = newWeight;

      // Distribute the remaining weight: 100 - newWeight - sumLocked
      const remaining = 100 - newWeight - sumLocked;

      // Sum of current weights of other unlocked slugs
      const sumUnlocked = otherUnlockedSlugs.reduce((sum, s) => sum + (currentWeights[s] ?? 0), 0);

      if (sumUnlocked > 0) {
        otherUnlockedSlugs.forEach((s) => {
          newWeights[s] = Math.round(((currentWeights[s] ?? 0) / sumUnlocked) * remaining);
        });
      } else {
        otherUnlockedSlugs.forEach((s) => {
          newWeights[s] = Math.round(remaining / otherUnlockedSlugs.length);
        });
      }

      // Handle rounding error to ensure exact sum of 100
      const totalCalculated = slugs.reduce((sum, s) => sum + (newWeights[s] ?? 0), 0);
      const error = 100 - totalCalculated;
      if (error !== 0 && otherUnlockedSlugs.length > 0) {
        const targetSlug = otherUnlockedSlugs[0];
        newWeights[targetSlug] = Math.max(0, (newWeights[targetSlug] ?? 0) + error);
      }

      return {
        ...current,
        assessmentWeights: newWeights,
      };
    });
    setSavedMessage(null);
    setErrorMessage(null);
  };

  const saveDraft = async () => {
    setSavedMessage(null);
    setErrorMessage(null);

    if (!isReady) {
      if (assessmentWeightTotal !== 100) {
        setErrorMessage(
          isEditStackMode
            ? "Assessment weights must equal 100% overall before saving."
            : "Assessment weights must equal 100% overall. Update the selected assessment weights before creating the campaign."
        );
      } else {
        setErrorMessage(
          isEditStackMode
            ? "Select at least one assessment before saving."
            : "Complete the required campaign fields and select assessments loaded from Strapi."
        );
      }
      return;
    }

    if (!isEditStackMode) {
      const candidateCount = Number.parseInt(draft.candidateVolume, 10);
      if (!Number.isInteger(candidateCount) || candidateCount < 1) {
        setErrorMessage("Expected candidates must be at least 1.");
        return;
      }
    }

    setIsSaving(true);
    try {
      const perAssessmentSettings = selectedAssessments.reduce<Record<string, Record<string, unknown>>>(
        (settings, assessment) => {
          const version = draft.assessmentVersions[assessment.slug] ?? DEFAULT_ASSESSMENT_VERSION;
          settings[assessment.slug] = {
            version,
            difficulty: assessment.slug === "typing" ? draft.typingDifficulty : "Base",
            ...(assessment.slug === "prioritisation"
              ? {
                  scoringMode: draft.prioritisationScoringMode,
                }
              : {}),
          };
          return settings;
        },
        {}
      );

      const assessmentSettings = {
        weights: selectedAssessments.reduce<Record<string, number>>(
          (weights, assessment) => {
            weights[assessment.slug] = draft.assessmentWeights[assessment.slug] ?? 0;
            return weights;
          },
          {}
        ),
        ...perAssessmentSettings,
      };

      if (isEditStackMode) {
        if (!campaignId) {
          throw new Error("Campaign could not be identified.");
        }

        const response = await fetch(
          `/api/hiring-manager/campaigns/${campaignId}/assessment-stack`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              assessmentDocumentIds: selectedAssessments
                .map((assessment) => assessment.documentId)
                .filter(Boolean),
              assessmentSettings,
              assessmentMode:
                draft.deliveryMode === "remote"
                  ? "remote"
                  : draft.deliveryMode === "hybrid"
                    ? "hybrid"
                    : "in_person",
            }),
          }
        );
        const body = (await response.json().catch(() => ({}))) as CreateCampaignResponse;

        if (!response.ok) {
          throw new Error(body.error || "Assessment stack could not be updated.");
        }

        HiringManagerPortalClientService.invalidate();
        router.refresh();
        router.push(`/hiring-manager-dashboard/campaigns/${campaignId}`);
        return;
      }

      const candidateCount = Number.parseInt(draft.candidateVolume, 10);
      const response = await fetch("/api/hiring-manager/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.campaignName.trim(),
          jobRole: draft.roleTitle.trim(),
          campaignType: "external",
          startDate: toStartDateTime(draft.startDate),
          isOngoing: false,
          vacancyCount: candidateCount,
          location: draft.location.trim(),
          assessmentMode:
            draft.deliveryMode === "remote"
              ? "remote"
              : draft.deliveryMode === "hybrid"
                ? "hybrid"
                : "in_person",
          assessmentDocumentIds: selectedAssessments
            .map((assessment) => assessment.documentId)
            .filter(Boolean),
          assessmentSettings,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as CreateCampaignResponse;

      if (!response.ok) {
        throw new Error(body.error || "Campaign could not be created.");
      }

      HiringManagerPortalClientService.invalidate();
      const returnTo = searchParams.get("returnTo");
      const safeReturnTo =
        returnTo?.startsWith("/hiring-manager-dashboard/")
          ? returnTo
          : "/hiring-manager-dashboard/campaigns/";
      router.refresh();
      router.push(safeReturnTo);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isEditStackMode
            ? "Assessment stack could not be updated."
            : "Campaign could not be created."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-5">
        {!isEditStackMode ? (
        <Card className={portalHeroPanelClass}>
          <CardHeader className="border-b border-border/50 p-5 dark:border-white/5">
            <CardTitle className="text-base font-bold text-foreground">Campaign details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="campaignName" className={portalLabelClass}>
                Campaign name
              </Label>
              <Input
                id="campaignName"
                value={draft.campaignName}
                onChange={(event) => updateDraft("campaignName", event.target.value)}
                placeholder="e.g. Spring control room intake"
                className={cn(portalInputClass, "h-10 transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleTitle" className={portalLabelClass}>
                Role title
              </Label>
              <Input
                id="roleTitle"
                value={draft.roleTitle}
                onChange={(event) => updateDraft("roleTitle", event.target.value)}
                placeholder="Emergency call handler"
                className={cn(portalInputClass, "h-10 transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location" className={portalLabelClass}>
                Location
              </Label>
              <Input
                id="location"
                value={draft.location}
                onChange={(event) => updateDraft("location", event.target.value)}
                placeholder="Assessment centre or operational area"
                className={cn(portalInputClass, "h-10 transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50")}
              />
            </div>

            <div className="space-y-2">
              <OptionalDateField
                id="startDate"
                label="Planned start"
                value={draft.startDate}
                onChange={(value) => updateDraft("startDate", value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes" className={portalLabelClass}>
                Operational notes
              </Label>
              <Textarea
                id="notes"
                value={draft.notes}
                onChange={(event) => updateDraft("notes", event.target.value)}
                placeholder="Optional notes for recruiters, assessors, or session planning."
                className={cn(portalInputClass, "min-h-24 transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50")}
              />
            </div>
          </CardContent>
        </Card>
        ) : null}

        <Card className={portalHeroPanelClass}>
          <CardHeader className="border-b border-border/50 p-5 dark:border-white/5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base font-bold text-foreground">
                Assessment stack
              </CardTitle>
              <Badge className="w-fit rounded-md border-primary/20 bg-primary/10 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 px-2 py-0.5 pointer-events-none">
                {assessments.length} active from backend
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            {assessments.length === 0 ? (
              <div className={portalEmptyPanelClass}>
                No active assessments came back from Strapi. Start the backend,
                check role permissions for `assessments`, then refresh this page.
              </div>
            ) : (
              assessments.map((assessment) => {
                const checked = draft.assessmentSlugs.includes(assessment.slug);
                const Icon = getAssessmentCatalogueIcon(assessment.slug);

                return (
                  <div
                    key={assessment.id}
                    onClick={() => toggleAssessment(assessment.slug)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleAssessment(assessment.slug);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      checked ? portalSelectableCardSelectedClass : portalSelectableCardClass,
                      "cursor-pointer p-4 text-left"
                    )}
                  >
                    <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-start">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleAssessment(assessment.slug)}
                        onClick={(event) => event.stopPropagation()}
                        className="mt-1.5 border-white/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary rounded-md"
                        aria-label={`Select ${assessment.title}`}
                      />
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={cn(
                              portalIconWrapClass,
                              "h-10 w-10 rounded-xl",
                              checked && "border-primary/30 bg-primary/15 text-primary"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="break-words text-sm font-bold leading-5 text-foreground">
                              {assessment.title}
                            </p>
                            <p className={cn(portalLabelClass, "mt-0.5 normal-case")}>
                              {assessment.skills.slice(0, 3).join(" · ")}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-muted-foreground">
                          {assessment.summary}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 sm:justify-end">
                        <Badge className={cn("pointer-events-none rounded-md border-none px-2 py-0.5 text-[10px] font-semibold", portalBadgeClass)}>
                          {assessment.duration}
                        </Badge>
                        {assessment.passingScore !== null && (
                          <Badge className={cn("pointer-events-none rounded-md border-none px-2 py-0.5 text-[10px] font-semibold", portalBadgeClass)}>
                            Pass {assessment.passingScore}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <Card className={portalHeroPanelClass}>
          <CardHeader className="border-b border-border/50 p-5 dark:border-white/5">
            <CardTitle className="text-base font-bold text-foreground">
              {isEditStackMode ? "Update campaign setup" : "Campaign review"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className={portalSelectableCardGroupClass}>
              <p className={portalLabelClass}>
                Delivery mode
              </p>
              <div className="mt-3 grid gap-2">
                {(["in_person", "remote", "hybrid"] as const).map((mode) => {
                  const isRemote = mode === "remote";
                  const isHybrid = mode === "hybrid";
                  const locked = (isRemote && !allowRemoteDelivery) || (isHybrid && !allowHybridDelivery);
                  
                  return (
                     <button
                       key={mode}
                       type="button"
                       disabled={locked}
                       onClick={() => updateDraft("deliveryMode", mode)}
                       className={cn(
                         draft.deliveryMode === mode
                           ? portalSelectableCardSelectedClass
                           : portalSelectableCardClass,
                         "flex items-center justify-between px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider",
                         locked && "cursor-not-allowed opacity-50"
                       )}
                     >
                       {mode.replace("_", " ").replace("-", " ")}
                       {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                     </button>
                  );
                })}
              </div>
              {(!allowRemoteDelivery || !allowHybridDelivery) && (
                <p className={cn(portalAlertInfoClass, "mt-3 text-[10px] leading-relaxed")}>
                  Remote and Hybrid options require client feature activation by an administrator.
                </p>
              )}
            </div>

            <div className={portalSelectableCardGroupClass}>
              <div className="flex items-center justify-between">
                <p className={portalLabelClass}>
                  Selected stack
                </p>
                {selectedAssessments.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLockedSlugs([]);
                      updateDraft("assessmentWeights", buildEqualWeights(draft.assessmentSlugs));
                    }}
                    className="h-6 rounded-md px-2 text-[9px] font-bold uppercase tracking-wider text-indigo-400 hover:bg-indigo-400/10 hover:text-indigo-300 transition-colors"
                  >
                    Distribute Equally
                  </Button>
                )}
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {selectedAssessments.length === 0 ? (
                  <p className="text-xs italic leading-normal text-muted-foreground">
                    Select at least one assessment from the stack above.
                  </p>
                ) : (
                  selectedAssessments.map((assessment, index) => {
                    const selectedVersion = draft.assessmentVersions[assessment.slug] ?? DEFAULT_ASSESSMENT_VERSION;
                    const selectedVersionOption = getSelectedVersionOption(assessment, selectedVersion);
                    return (
                    <div
                      key={assessment.slug}
                      className={cn(portalPanelNestedClass, "px-3 py-3")}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={portalLabelClass}>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1 break-words text-xs font-bold text-foreground">
                          {assessment.title}
                        </span>
                        <span className={portalLabelClass}>
                          {assessment.duration}
                        </span>
                      </div>
                      {assessment.slug === "typing" && (
                        <div className="mt-3 space-y-2">
                          <Label className={portalLabelClass}>
                            Typing level
                          </Label>
                          <div className="mt-2 grid gap-1.5">
                            {(["Base", "Intermediate", "Extreme"] as const).map((level) => {
                              const isActive = draft.typingDifficulty === level;
                              return (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={() => updateDraft("typingDifficulty", level)}
                                  className={cn(
                                    isActive
                                      ? portalSelectableCardSelectedClass
                                      : portalSelectableCardClass,
                                    "flex items-center justify-center px-3 py-2 text-xs font-semibold"
                                  )}
                                >
                                  {level}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <div className="mt-3 space-y-2">
                        <Label className={portalLabelClass}>
                          Data version
                        </Label>
                        <Select
                          value={selectedVersion}
                          onValueChange={(value) =>
                            setDraft((current) => ({
                              ...current,
                              assessmentVersions: {
                                ...current.assessmentVersions,
                                [assessment.slug]: value,
                              },
                            }))
                          }
                        >
                          <SelectTrigger className={cn(portalInputClass, "h-9 rounded-xl text-xs")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getVersionOptions(assessment).map((version) => (
                              <SelectItem key={version.version} value={version.version}>
                                {version.title || `v${version.version}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <VersionPreviewPanel assessment={assessment} version={selectedVersionOption} />
                      </div>
                      {assessment.slug === "prioritisation" && (
                        <div className="mt-3 space-y-2">
                          <Label className={portalLabelClass}>
                            Scoring Mode
                          </Label>
                          <div className="mt-2 grid gap-1.5">
                            {(["Basic", "Advanced"] as const).map((mode) => {
                              const isActive = draft.prioritisationScoringMode === mode;
                              return (
                                <button
                                  key={mode}
                                  type="button"
                                  onClick={() => updateDraft("prioritisationScoringMode", mode)}
                                  className={cn(
                                    isActive
                                      ? portalSelectableCardSelectedClass
                                      : portalSelectableCardClass,
                                    "flex items-center justify-center px-3 py-2 text-xs font-semibold"
                                  )}
                                >
                                  {mode}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <div className="mt-3 space-y-2">
                        <Label
                          htmlFor={`weight-${assessment.slug}`}
                          className={portalLabelClass}
                        >
                          Weighting
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id={`weight-${assessment.slug}`}
                            type="number"
                            min="0"
                            max="100"
                            value={draft.assessmentWeights[assessment.slug] ?? 0}
                            disabled={lockedSlugs.includes(assessment.slug)}
                            onChange={(event) =>
                              updateAssessmentWeight(
                                assessment.slug,
                                event.target.value
                              )
                            }
                            className={cn(portalInputClass, "h-9 transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50")}
                          />
                          <span className="mr-1 text-xs font-bold text-muted-foreground">%</span>
                          
                          {draft.assessmentSlugs.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleLockSlug(assessment.slug)}
                              className={cn(
                                "h-9 w-9 shrink-0 rounded-lg transition-colors",
                                lockedSlugs.includes(assessment.slug)
                                  ? "bg-muted/40 text-foreground hover:bg-muted/60"
                                  : "bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                              )}
                              title={lockedSlugs.includes(assessment.slug) ? "Weight locked (Click to unlock)" : "Weight unlocked (Click to lock)"}
                            >
                              {lockedSlugs.includes(assessment.slug) ? (
                                <Lock className="h-3.5 w-3.5" />
                              ) : (
                                <Unlock className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </div>

            {selectedAssessments.length > 0 && (
              <div
                className={cn(
                  "rounded-xl border p-3.5",
                  assessmentWeightTotal === 100 ? portalAlertInfoClass : portalAlertErrorClass
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold">
                    Total weighting
                  </p>
                  <p className="text-base font-bold text-foreground">
                    {assessmentWeightTotal}%
                  </p>
                </div>
                {assessmentWeightTotal !== 100 && (
                  <p className="mt-2 text-[10px] leading-relaxed opacity-80">
                    {isEditStackMode
                      ? "Weights must sum to 100% before saving."
                      : "Weights must sum to 100% before the campaign can be created."}
                  </p>
                )}
              </div>
            )}

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-4 w-4" />
                <p className="text-xs uppercase font-bold tracking-wider">Estimated time</p>
              </div>
              <p className="mt-2 text-2xl font-black text-white">
                {formatTotalDuration(totalDurationSeconds)}
              </p>
            </div>

            <Button
              type="button"
              disabled={!hasRequiredSetup || isSaving}
              onClick={saveDraft}
              className={cn(portalPrimaryButtonClass, "h-10 w-full disabled:cursor-not-allowed disabled:opacity-50")}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving
                ? isEditStackMode
                  ? "Saving…"
                  : "Creating…"
                : isEditStackMode
                  ? "Save changes"
                  : "Create campaign"}
            </Button>

            {savedMessage && (
              <p className={cn(portalAlertInfoClass, "text-xs leading-normal")}>
                {savedMessage}
              </p>
            )}

            {errorMessage && (
              <p className={cn(portalAlertErrorClass, "text-xs leading-normal")}>
                {errorMessage}
              </p>
            )}

          </CardContent>
        </Card>
      </section>
    </div>
  );
}
