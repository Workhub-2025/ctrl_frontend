"use client";

import { useMemo, useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Lock,
  Unlock,
  Save,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { getAssessmentCatalogueIcon } from "@/assessments/plugins/display";
import { getAssessmentPlatformEntry, preferredAssessmentReleaseVersion } from "@/lib/assessment-platform-registry";
import { isPremiumCatalogueTier } from "@/lib/client/entitlements";
import type { HiringManagerAssessment } from "@/services/hiring-manager-assessments.service";
import {
  HiringManagerPortalClientService,
  type HiringManagerCampaignListItem,
} from "@/services/hiring-manager-portal-client.service";
import { canCreateSessionForCampaign } from "@/lib/hiring-manager/campaign-session-approval";
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
  portalSelectableCardClass,
  portalSelectableCardGroupClass,
  portalSelectableCardSelectedClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { PortalRequirementList } from "@/components/dashboard/portal/portal-ui";
import { PortalStepper } from "@/components/dashboard/portal/portal-navigation-ui";
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
    assessmentThresholds?: Record<string, number>;
    typingDifficulty: CampaignDraft["typingDifficulty"];
    prioritisationScoringMode: CampaignDraft["prioritisationScoringMode"];
    deliveryMode: CampaignDraft["deliveryMode"];
  };
}

type CreateCampaignResponse = {
  data?: {
    campaign?: HiringManagerCampaignListItem;
  };
  error?: string;
};

type DeliveryMode = "in_person" | "remote" | "hybrid";

type CampaignDraft = {
  campaignName: string;
  roleTitle: string;
  location: string;
  deliveryMode: DeliveryMode;
  candidateVolume: string;
  startDate: string;
  assessmentSlugs: string[];
  assessmentWeights: Record<string, number>;
  assessmentVersions: Record<string, string>;
  assessmentThresholds: Record<string, number>;
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
  assessmentSlugs: [],
  assessmentWeights: {},
  assessmentVersions: {},
  assessmentThresholds: {},
  typingDifficulty: "Base",
  prioritisationScoringMode: "Basic",
};

const DELIVERY_MODES: readonly {
  id: DeliveryMode;
  label: string;
  description: string;
}[] = [
  {
    id: "in_person",
    label: "In-person",
    description: "Candidates attend a site and start with a session access code.",
  },
  {
    id: "remote",
    label: "Remote",
    description: "Candidates join from anywhere using an emailed invite.",
  },
  {
    id: "hybrid",
    label: "Hybrid",
    description: "Run on-site and remote sessions under one campaign.",
  },
];

const CANDIDATE_VOLUME_PRESETS = [25, 50, 100, 250];

/**
 * On-site candidates are identity-checked in the room and start from a session
 * code, so email confirmation is skipped for in-person campaigns. Anything that
 * can be delivered remotely keeps verification on.
 */
function bypassesEmailConfirmation(deliveryMode: DeliveryMode) {
  return deliveryMode === "in_person";
}

function includesOnSiteDelivery(deliveryMode: DeliveryMode) {
  return deliveryMode !== "remote";
}

function getVersionOptions(assessment: HiringManagerAssessment) {
  if (assessment.availableVersions.length > 0) {
    return assessment.availableVersions;
  }
  const preferred = preferredAssessmentReleaseVersion(assessment.slug);
  return [
    {
      version: preferred,
      title: `v${preferred}`,
      description: null as string | null,
    },
  ];
}

function defaultVersionFor(assessment: HiringManagerAssessment): string {
  const options = getVersionOptions(assessment);
  const preferred = preferredAssessmentReleaseVersion(assessment.slug);
  const match = options.find((option) => option.version === preferred);
  if (match) return match.version;
  return options[0]?.version ?? preferred;
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

function ReviewRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-medium text-foreground">
        {value}
      </dd>
    </div>
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
  const isEditStackMode = mode === "edit-stack";
  const [draft, setDraft] = useState<CampaignDraft>(emptyDraft);
  const [lockedSlugs, setLockedSlugs] = useState<string[]>([]);
  const [step, setStep] = useState<"details" | "stack">(
    isEditStackMode ? "stack" : "details"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 10);
  }, []);

  useEffect(() => {
    if (!isEditStackMode || !initialStackDraft) return;

    setDraft((current) => ({
      ...current,
      assessmentSlugs: initialStackDraft.assessmentSlugs,
      assessmentWeights: initialStackDraft.assessmentWeights,
      assessmentVersions: initialStackDraft.assessmentVersions,
      assessmentThresholds: initialStackDraft.assessmentThresholds ?? current.assessmentThresholds,
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

  const candidateVolume = Number.parseInt(draft.candidateVolume, 10);
  const hasValidCandidateVolume = Number.isInteger(candidateVolume) && candidateVolume >= 1;
  const hasLoadedAssessments =
    selectedAssessments.length > 0 &&
    selectedAssessments.every((assessment) => assessment.documentId);

  const detailRequirements = useMemo(
    () => [
      { id: "name", label: "Name the campaign", met: Boolean(draft.campaignName.trim()) },
      { id: "role", label: "Add the role title", met: Boolean(draft.roleTitle.trim()) },
      {
        id: "volume",
        label: "Set how many candidates you expect",
        met: hasValidCandidateVolume,
      },
      { id: "start", label: "Choose a planned start date", met: Boolean(draft.startDate.trim()) },
    ],
    [draft.campaignName, draft.roleTitle, draft.startDate, hasValidCandidateVolume]
  );

  const stackRequirements = useMemo(
    () => [
      {
        id: "assessments",
        label: "Select at least one assessment",
        met: hasLoadedAssessments,
      },
      {
        id: "weights",
        label: "Balance the weighting to 100%",
        met: selectedAssessments.length > 0 && assessmentWeightTotal === 100,
      },
    ],
    [assessmentWeightTotal, hasLoadedAssessments, selectedAssessments.length]
  );

  const requirements = isEditStackMode
    ? stackRequirements
    : [...detailRequirements, ...stackRequirements];
  const detailsComplete = detailRequirements.every((requirement) => requirement.met);
  const isReady = requirements.every((requirement) => requirement.met);

  const updateDraft = <Key extends keyof CampaignDraft>(
    key: Key,
    value: CampaignDraft[Key]
  ) => {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
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
    const assessment = assessments.find((entry) => entry.slug === slug);
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
              [slug]: assessment
                ? defaultVersionFor(assessment)
                : preferredAssessmentReleaseVersion(slug),
            },
        assessmentThresholds: exists
          ? removeRecordKey(current.assessmentThresholds, slug)
          : { ...current.assessmentThresholds, [slug]: 70 },
      };
    });
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
    setErrorMessage(null);
  };

  const saveDraft = async () => {
    setErrorMessage(null);

    if (!isReady) {
      const outstanding = requirements.find((requirement) => !requirement.met);
      setErrorMessage(
        outstanding
          ? `${outstanding.label} before ${isEditStackMode ? "saving" : "creating the campaign"}.`
          : "Finish the outstanding setup steps first."
      );
      if (!isEditStackMode && !detailsComplete) {
        setStep("details");
      }
      return;
    }

    setIsSaving(true);
    try {
      const perAssessmentSettings = selectedAssessments.reduce<Record<string, Record<string, unknown>>>(
        (settings, assessment) => {
          const version =
            draft.assessmentVersions[assessment.slug] ??
            defaultVersionFor(assessment);
          settings[assessment.slug] = {
            version,
            threshold: draft.assessmentThresholds[assessment.slug] ?? 70,
            ...(assessment.slug === "typing" ? { difficulty: draft.typingDifficulty } : {}),
            ...(assessment.slug === "prioritisation"
              ? { scoringMode: draft.prioritisationScoringMode }
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
              assessmentMode: draft.deliveryMode,
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

      const response = await fetch("/api/hiring-manager/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.campaignName.trim(),
          jobRole: draft.roleTitle.trim(),
          campaignType: "external",
          startDate: toStartDateTime(draft.startDate),
          isOngoing: false,
          vacancyCount: candidateVolume,
          location: includesOnSiteDelivery(draft.deliveryMode) ? draft.location.trim() : "",
          assessmentMode: draft.deliveryMode,
          bypassEmailConfirmation: bypassesEmailConfirmation(draft.deliveryMode),
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

      const createdCampaign = body.data?.campaign;
      const createdCampaignId = createdCampaign?.documentId ?? createdCampaign?.id;
      if (!createdCampaign || !createdCampaignId) {
        throw new Error("Campaign was created but its workspace could not be identified.");
      }

      HiringManagerPortalClientService.invalidate();
      router.refresh();
      if (!canCreateSessionForCampaign(createdCampaign.approvalStatus)) {
        router.push(
          "/hiring-manager-dashboard/campaigns/" +
            encodeURIComponent(createdCampaignId) +
            "?created=1"
        );
      } else {
        router.push(
          "/hiring-manager-dashboard/campaigns/" +
            encodeURIComponent(createdCampaignId) +
            "?tab=sessions&create=1"
        );
      }
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

  const selectedDeliveryMode =
    DELIVERY_MODES.find((option) => option.id === draft.deliveryMode) ?? DELIVERY_MODES[0];

  const detailsPanel = (
    <div className="space-y-5">
      <Card className={portalHeroPanelClass}>
        <CardHeader className="border-b border-border p-5">
          <CardTitle className="text-base font-bold text-foreground">Campaign details</CardTitle>
          <p className="text-sm text-muted-foreground">
            Used across the client portal, candidate invites, and session planning.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="campaignName" className={portalLabelClass}>
              Campaign name
            </Label>
            <Input
              id="campaignName"
              name="campaignName"
              autoComplete="off"
              value={draft.campaignName}
              onChange={(event) => updateDraft("campaignName", event.target.value)}
              placeholder="e.g. Spring assessment intake"
              className={cn(portalInputClass, "h-10")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roleTitle" className={portalLabelClass}>
              Role title
            </Label>
            <Input
              id="roleTitle"
              name="roleTitle"
              autoComplete="off"
              value={draft.roleTitle}
              onChange={(event) => updateDraft("roleTitle", event.target.value)}
              placeholder="e.g. Call handler"
              className={cn(portalInputClass, "h-10")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="candidateVolume" className={portalLabelClass}>
              Expected candidates
            </Label>
            <Input
              id="candidateVolume"
              name="candidateVolume"
              autoComplete="off"
              inputMode="numeric"
              value={draft.candidateVolume}
              onChange={(event) =>
                updateDraft("candidateVolume", event.target.value.replace(/\D/g, "").slice(0, 4))
              }
              className={cn(portalInputClass, "h-10")}
            />
            <div className="flex flex-wrap gap-2" aria-label="Expected candidate presets">
              {CANDIDATE_VOLUME_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="outline"
                  onClick={() => updateDraft("candidateVolume", String(preset))}
                  className="h-8 px-3 text-xs"
                >
                  {preset}
                </Button>
              ))}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Sets the default capacity for each session you add later.
            </p>
          </div>
          <div className="space-y-2">
            <OptionalDateField
              id="startDate"
              label="Planned start date"
              value={draft.startDate}
              onChange={(value) => updateDraft("startDate", value)}
              min={today}
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Sessions can be scheduled on any date once the campaign is live.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={portalHeroPanelClass}>
        <CardHeader className="border-b border-border p-5">
          <CardTitle className="text-base font-bold text-foreground">Delivery</CardTitle>
          <p className="text-sm text-muted-foreground">
            How candidates reach the assessment. This decides how they are verified.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-2 sm:grid-cols-3">
            {DELIVERY_MODES.map((option) => {
              const locked =
                (option.id === "remote" && !allowRemoteDelivery) ||
                (option.id === "hybrid" && !allowHybridDelivery);
              const selected = draft.deliveryMode === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={locked}
                  aria-pressed={selected}
                  onClick={() => updateDraft("deliveryMode", option.id)}
                  className={cn(
                    selected ? portalSelectableCardSelectedClass : portalSelectableCardClass,
                    "flex min-h-24 flex-col gap-1.5 p-3.5 text-left",
                    locked && "cursor-not-allowed opacity-50"
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{option.label}</span>
                    {locked ? (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    ) : selected ? (
                      <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                    ) : null}
                  </span>
                  <span className="text-xs leading-5 text-muted-foreground">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>

          {!allowRemoteDelivery || !allowHybridDelivery ? (
            <p className={cn(portalAlertInfoClass, "text-xs leading-5")}>
              Remote and hybrid delivery need to be switched on for your organisation by a CTRL
              administrator.
            </p>
          ) : null}

          <div className={cn(portalPanelNestedClass, "p-4")}>
            <p className={portalLabelClass}>Candidate verification</p>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground">
              {bypassesEmailConfirmation(draft.deliveryMode)
                ? "Skipped. On-site candidates are identity-checked in the room and start straight from the session access code."
                : "Required. Candidates confirm their email address before they can start an assessment."}
            </p>
          </div>

          {includesOnSiteDelivery(draft.deliveryMode) ? (
            <div className="space-y-2">
              <Label htmlFor="location" className={portalLabelClass}>
                Site or location
              </Label>
              <Input
                id="location"
                name="location"
                autoComplete="off"
                value={draft.location}
                onChange={(event) => updateDraft("location", event.target.value)}
                placeholder="e.g. London assessment centre"
                className={cn(portalInputClass, "h-10")}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Optional. Pre-fills the room field when you create in-person sessions.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => setStep("stack")}
          className={cn(portalPrimaryButtonClass, "h-10 px-5")}
        >
          Continue to assessments
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );

  const stackPanel = (
    <div className="space-y-5">
      <Card className={portalHeroPanelClass}>
        <CardHeader className="border-b border-border p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Assessment stack
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Pick the assessments candidates will take, then tune each one in place.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <span className={cn(portalBadgeClass, "px-2.5 py-1")}>
                {selectedAssessments.length} of {assessments.length} selected
              </span>
              {selectedAssessments.length > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setLockedSlugs([]);
                    updateDraft("assessmentWeights", buildEqualWeights(draft.assessmentSlugs));
                  }}
                  className="h-8 px-3 text-xs"
                >
                  Distribute equally
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-5">
          {assessments.length === 0 ? (
            <div className={portalEmptyPanelClass}>
              No assessments are available on your plan yet. Refresh the page, and contact your
              CTRL administrator if this keeps happening.
            </div>
          ) : (
            assessments.map((assessment) => {
              const checked = draft.assessmentSlugs.includes(assessment.slug);
              const Icon = getAssessmentCatalogueIcon(assessment.slug);
              const selectedVersion =
                draft.assessmentVersions[assessment.slug] ??
                defaultVersionFor(assessment);
              const isLocked = lockedSlugs.includes(assessment.slug);

              return (
                <div
                  key={assessment.id}
                  className={cn(
                    checked ? portalSelectableCardSelectedClass : portalSelectableCardClass,
                    "overflow-hidden"
                  )}
                >
                  <button
                    type="button"
                    aria-pressed={checked}
                    onClick={() => toggleAssessment(assessment.slug)}
                    className="grid w-full gap-3 p-4 text-left sm:grid-cols-[auto_1fr_auto] sm:items-start"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background"
                      )}
                      aria-hidden="true"
                    >
                      {checked ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn(
                            portalIconWrapClass,
                            "h-10 w-10",
                            checked && "border-primary/30 bg-primary/15 text-primary"
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="break-words text-sm font-bold leading-5 text-foreground">
                              {assessment.title}
                            </span>
                            {isPremiumCatalogueTier(assessment.entitlementTier) ? (
                              <span
                                className={cn(
                                  portalBadgeClass,
                                  "shrink-0 px-2 py-0.5 text-[10px] font-semibold"
                                )}
                              >
                                Premium
                              </span>
                            ) : null}
                          </span>
                          <span className={cn(portalLabelClass, "mt-0.5 block normal-case")}>
                            {assessment.skills.slice(0, 3).join(" · ")}
                          </span>
                        </span>
                      </span>
                      <span className="mt-3 block text-xs leading-5 text-muted-foreground">
                        {assessment.summary}
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-1.5 sm:justify-end">
                      {(() => {
                        const mode = getAssessmentPlatformEntry(assessment.slug)?.timerMode ?? "enforced";
                        return (
                          <>
                            <span className={cn(portalBadgeClass, "px-2 py-0.5")}>
                              {mode === "stage_owned"
                                ? "Self-paced (stage timed)"
                                : mode === "display_only"
                                  ? `About ${assessment.duration}`
                                  : assessment.duration}
                            </span>
                            <span className={cn(portalBadgeClass, "px-2 py-0.5 border-primary/30 text-primary font-medium")}>
                              {mode === "stage_owned"
                                ? "Stage-Owned"
                                : mode === "display_only"
                                  ? "Display Only"
                                  : "Enforced Timer"}
                            </span>
                          </>
                        );
                      })()}
                      {assessment.passingScore !== null ? (
                        <span className={cn(portalBadgeClass, "px-2 py-0.5")}>
                          Pass {assessment.passingScore}%
                        </span>
                      ) : null}
                    </span>
                  </button>

                  {checked ? (
                    <div className="space-y-4 border-t border-border bg-background/40 p-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor={`weight-${assessment.slug}`}
                            className={portalLabelClass}
                          >
                            Weighting
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id={`weight-${assessment.slug}`}
                              name={`weight-${assessment.slug}`}
                              autoComplete="off"
                              type="number"
                              min="0"
                              max="100"
                              value={draft.assessmentWeights[assessment.slug] ?? 0}
                              disabled={isLocked}
                              onChange={(event) =>
                                updateAssessmentWeight(assessment.slug, event.target.value)
                              }
                              className={cn(portalInputClass, "h-10")}
                            />
                            <span className="text-xs font-bold text-muted-foreground">%</span>
                            {draft.assessmentSlugs.length > 1 ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => toggleLockSlug(assessment.slug)}
                                className="h-10 w-10 shrink-0"
                                aria-pressed={isLocked}
                                title={
                                  isLocked
                                    ? "Weight locked — other assessments absorb changes"
                                    : "Lock this weight"
                                }
                              >
                                {isLocked ? (
                                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                                ) : (
                                  <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                                )}
                                <span className="sr-only">
                                  {isLocked ? "Unlock weighting" : "Lock weighting"}
                                </span>
                              </Button>
                            ) : null}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor={`threshold-${assessment.slug}`}
                            className={portalLabelClass}
                          >
                            Standard threshold
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id={`threshold-${assessment.slug}`}
                              name={`threshold-${assessment.slug}`}
                              autoComplete="off"
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={draft.assessmentThresholds[assessment.slug] ?? 70}
                              onChange={(event) => {
                                const next = Math.max(
                                  0,
                                  Math.min(100, Number.parseInt(event.target.value || "0", 10))
                                );
                                setDraft((current) => ({
                                  ...current,
                                  assessmentThresholds: {
                                    ...current.assessmentThresholds,
                                    [assessment.slug]: next,
                                  },
                                }));
                              }}
                              className={cn(portalInputClass, "h-10")}
                            />
                            <span className="text-xs font-bold text-muted-foreground">%</span>
                          </div>
                          <p className="text-xs leading-5 text-muted-foreground">
                            Snapshotted when a candidate starts. Evidence for reviewers, not an
                            automated hiring decision.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label className={portalLabelClass}>Module release</Label>
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
                            <SelectTrigger className={cn(portalInputClass, "h-10 text-sm")}>
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
                          <p className="text-xs leading-5 text-muted-foreground">
                            Browse release notes in the{" "}
                            <Link
                              href="/hiring-manager-dashboard/assessments"
                              className="font-medium text-primary underline-offset-2 hover:underline"
                            >
                              Assessment library
                            </Link>
                            .
                          </p>
                        </div>

                        {assessment.slug === "typing" ? (
                          <div className="space-y-2">
                            <Label className={portalLabelClass}>Typing difficulty</Label>
                            <Select
                              value={draft.typingDifficulty}
                              onValueChange={(value) =>
                                updateDraft(
                                  "typingDifficulty",
                                  value as CampaignDraft["typingDifficulty"]
                                )
                              }
                            >
                              <SelectTrigger className={cn(portalInputClass, "h-10 text-sm")}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Base">Base</SelectItem>
                                <SelectItem value="Intermediate">Intermediate</SelectItem>
                                <SelectItem value="Extreme">Extreme</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}

                        {assessment.slug === "prioritisation" ? (
                          <div className="space-y-2">
                            <Label className={portalLabelClass}>Scoring mode</Label>
                            <Select
                              value={draft.prioritisationScoringMode}
                              onValueChange={(value) =>
                                updateDraft(
                                  "prioritisationScoringMode",
                                  value as CampaignDraft["prioritisationScoringMode"]
                                )
                              }
                            >
                              <SelectTrigger className={cn(portalInputClass, "h-10 text-sm")}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Basic">Basic</SelectItem>
                                <SelectItem value="Advanced">Advanced</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {!isEditStackMode ? (
        <div className="flex justify-start">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep("details")}
            className="h-10 px-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to campaign details
          </Button>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-5">
      {!isEditStackMode ? (
        <PortalStepper
          label="Campaign setup steps"
          activeId={step}
          onSelect={(id) => setStep(id as "details" | "stack")}
          steps={[
            {
              id: "details",
              label: "Campaign details",
              description: "Role, volume, delivery",
              complete: detailsComplete,
            },
            {
              id: "stack",
              label: "Assessments",
              description: "Stack and weighting",
              complete: stackRequirements.every((requirement) => requirement.met),
            },
          ]}
        />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] xl:items-start">
        {step === "details" && !isEditStackMode ? detailsPanel : stackPanel}

        <section className="space-y-4 xl:sticky xl:top-20 xl:max-h-[calc(100dvh-6rem)] xl:overflow-y-auto xl:overscroll-contain">
          <Card className={portalHeroPanelClass}>
            <CardHeader className="border-b border-border p-5">
              <CardTitle className="text-base font-bold text-foreground">
                {isEditStackMode ? "Stack review" : "Campaign review"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {!isEditStackMode ? (
                <dl className="divide-y divide-border">
                  <ReviewRow
                    label="Campaign"
                    value={draft.campaignName.trim() || "Not set"}
                  />
                  <ReviewRow label="Role" value={draft.roleTitle.trim() || "Not set"} />
                  <ReviewRow
                    label="Candidates"
                    value={hasValidCandidateVolume ? candidateVolume : "Not set"}
                  />
                  <ReviewRow
                    label="Planned start"
                    value={
                      draft.startDate
                        ? new Date(`${draft.startDate}T09:00:00`).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Not set"
                    }
                  />
                  <ReviewRow label="Delivery" value={selectedDeliveryMode.label} />
                  <ReviewRow
                    label="Email verification"
                    value={
                      bypassesEmailConfirmation(draft.deliveryMode) ? "Skipped" : "Required"
                    }
                  />
                  {includesOnSiteDelivery(draft.deliveryMode) && draft.location.trim() ? (
                    <ReviewRow label="Location" value={draft.location.trim()} />
                  ) : null}
                </dl>
              ) : null}

              <div className={cn(portalSelectableCardGroupClass, "space-y-3")}>
                <div className="flex items-center justify-between gap-3">
                  <p className={portalLabelClass}>Selected stack</p>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      selectedAssessments.length === 0 || assessmentWeightTotal === 100
                        ? "text-foreground"
                        : "text-destructive"
                    )}
                  >
                    {assessmentWeightTotal}%
                  </span>
                </div>
                {selectedAssessments.length === 0 ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Nothing selected yet. Choose assessments to build the stack.
                  </p>
                ) : (
                  <ol className="space-y-1.5">
                    {selectedAssessments.map((assessment, index) => (
                      <li
                        key={assessment.slug}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="tabular-nums text-muted-foreground">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="truncate font-medium text-foreground">
                            {assessment.title}
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {draft.assessmentWeights[assessment.slug] ?? 0}%
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
                {selectedAssessments.length > 0 && assessmentWeightTotal !== 100 ? (
                  <p className="text-xs leading-5 text-destructive">
                    Weighting must total 100%.
                  </p>
                ) : null}
              </div>

              <div className={cn(portalPanelNestedClass, "flex items-center gap-3 p-4")}>
                <span className={portalIconWrapClass}>
                  <Timer className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  <span className={cn(portalLabelClass, "block")}>Candidate time</span>
                  <span className="text-lg font-bold text-foreground">
                    {formatTotalDuration(totalDurationSeconds)}
                  </span>
                </span>
              </div>

              <PortalRequirementList
                title={isEditStackMode ? "Before you save" : "Before you create"}
                requirements={requirements}
                completeLabel={
                  isEditStackMode
                    ? "The stack is ready to save."
                    : "The campaign is ready to create."
                }
              />

              <Button
                type="button"
                disabled={!isReady || isSaving}
                onClick={saveDraft}
                className={cn(
                  portalPrimaryButtonClass,
                  "h-11 w-full disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                {isSaving
                  ? isEditStackMode
                    ? "Saving…"
                    : "Creating…"
                  : isEditStackMode
                    ? "Save changes"
                    : "Create campaign"}
              </Button>

              {!isEditStackMode ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  You will land on the campaign workspace next, where you can add the first
                  session.
                </p>
              ) : null}

              {errorMessage ? (
                <p className={cn(portalAlertErrorClass, "text-sm leading-5")} aria-live="polite">
                  {errorMessage}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
