"use client";

import { useMemo, useState } from "react";
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
  BrainCircuit,
  Headphones,
  Lock,
  Unlock,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  TimerReset,
} from "lucide-react";
import type { HiringManagerAssessment } from "@/services/hiring-manager-assessments.service";
import { HiringManagerPortalClientService } from "@/services/hiring-manager-portal-client.service";

type CampaignBuilderProps = {
  assessments: HiringManagerAssessment[];
};

type CreateCampaignResponse = {
  data?: unknown;
  error?: string;
};

const iconByKey = {
  typing: TimerReset,
  "call-simulation": Headphones,
  "situational-judgement": SlidersHorizontal,
  prioritisation: BrainCircuit,
  default: BrainCircuit,
} satisfies Record<HiringManagerAssessment["iconKey"], typeof BrainCircuit>;

type CampaignDraft = {
  campaignName: string;
  roleTitle: string;
  location: string;
  deliveryMode: "in-person" | "remote";
  candidateVolume: string;
  startDate: string;
  notes: string;
  assessmentSlugs: string[];
  assessmentWeights: Record<string, number>;
  typingDifficulty: "Base" | "Intermediate" | "Advanced";
};

const emptyDraft: CampaignDraft = {
  campaignName: "",
  roleTitle: "",
  location: "",
  deliveryMode: "in-person",
  candidateVolume: "100",
  startDate: "",
  notes: "",
  assessmentSlugs: [],
  assessmentWeights: {},
  typingDifficulty: "Base",
};

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
}: CampaignBuilderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<CampaignDraft>(emptyDraft);
  const [lockedSlugs, setLockedSlugs] = useState<string[]>([]);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
  const typingAssessment = selectedAssessments.find(
    (assessment) => assessment.slug === "typing"
  );
  const assessmentWeightTotal = selectedAssessments.reduce(
    (total, assessment) => total + (draft.assessmentWeights[assessment.slug] ?? 0),
    0
  );

  const hasRequiredSetup =
    draft.campaignName.trim() &&
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
          "Assessment weights must equal 100% overall. Update the selected assessment weights before creating the campaign."
        );
      } else {
        setErrorMessage(
          "Complete the required campaign fields and select assessments loaded from Strapi."
        );
      }
      return;
    }

    const candidateCount = Number.parseInt(draft.candidateVolume, 10);
    if (!Number.isInteger(candidateCount) || candidateCount < 1) {
      setErrorMessage("Expected candidates must be at least 1.");
      return;
    }

    setIsSaving(true);
    try {
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
              : "in_person",
          assessmentDocumentIds: selectedAssessments
            .map((assessment) => assessment.documentId)
            .filter(Boolean),
          assessmentSettings: {
            weights: selectedAssessments.reduce<Record<string, number>>(
              (weights, assessment) => {
                weights[assessment.slug] = draft.assessmentWeights[assessment.slug] ?? 0;
                return weights;
              },
              {}
            ),
            ...(typingAssessment
              ? {
                  typing: {
                    difficulty: draft.typingDifficulty,
                    durationSeconds: 60,
                    practiceRuns: 1,
                    assessmentRuns: 3,
                  },
                }
              : {}),
          },
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
        error instanceof Error ? error.message : "Campaign could not be created."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <Card className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0e172e]/85 to-[#0b1329]/50 backdrop-blur-md shadow-xl">
          <CardHeader className="border-b border-white/5 p-5">
            <CardTitle className="text-base font-bold text-white">Campaign details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="campaignName" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Campaign name
              </Label>
              <Input
                id="campaignName"
                value={draft.campaignName}
                onChange={(event) => updateDraft("campaignName", event.target.value)}
                placeholder="e.g. Spring control room intake"
                className="h-10 border-white/10 bg-white/[0.02] text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleTitle" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Role title
              </Label>
              <Input
                id="roleTitle"
                value={draft.roleTitle}
                onChange={(event) => updateDraft("roleTitle", event.target.value)}
                placeholder="Emergency call handler"
                className="h-10 border-white/10 bg-white/[0.02] text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Location
              </Label>
              <Input
                id="location"
                value={draft.location}
                onChange={(event) => updateDraft("location", event.target.value)}
                placeholder="Assessment centre or operational area"
                className="h-10 border-white/10 bg-white/[0.02] text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Planned start
              </Label>
              <Input
                id="startDate"
                type="date"
                value={draft.startDate}
                onChange={(event) => updateDraft("startDate", event.target.value)}
                className="h-10 border-white/10 bg-white/[0.02] text-slate-100 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors [color-scheme:dark]"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Operational notes
              </Label>
              <Textarea
                id="notes"
                value={draft.notes}
                onChange={(event) => updateDraft("notes", event.target.value)}
                placeholder="Optional notes for recruiters, assessors, or session planning."
                className="min-h-24 border-white/10 bg-white/[0.02] text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0e172e]/85 to-[#0b1329]/50 backdrop-blur-md shadow-xl">
          <CardHeader className="border-b border-white/5 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base font-bold text-white">
                Assessment stack
              </CardTitle>
              <Badge className="w-fit rounded-md border-primary/20 bg-primary/10 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 px-2 py-0.5 pointer-events-none">
                {assessments.length} active from backend
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            {assessments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-sm leading-6 text-slate-400 text-center">
                No active assessments came back from Strapi. Start the backend,
                check role permissions for `assessments`, then refresh this page.
              </div>
            ) : (
              assessments.map((assessment) => {
                const checked = draft.assessmentSlugs.includes(assessment.slug);
                const Icon = iconByKey[assessment.iconKey] ?? BrainCircuit;

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
                    className={`rounded-xl border p-4 text-left transition-all duration-300 cursor-pointer ${
                      checked
                        ? "border-primary/45 bg-[#0e172e]/60 shadow-[0_0_20px_rgba(99,102,241,0.08)]"
                        : "border-white/10 bg-white/[0.02] hover:border-primary/30 hover:bg-[#0e172e]/30"
                    }`}
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
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                            checked ? "border-primary/30 bg-primary/15 text-primary" : "border-white/15 bg-white/[0.04] text-slate-400"
                          }`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="break-words text-sm font-bold leading-5 text-white">
                              {assessment.title}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                              {assessment.skills.slice(0, 3).join(" · ")}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-slate-400">
                          {assessment.summary}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 sm:justify-end">
                        <Badge className="rounded-md border-white/10 bg-white/5 text-[10px] font-semibold text-slate-300 hover:bg-white/5 px-2 py-0.5 pointer-events-none">
                          {assessment.duration}
                        </Badge>
                        {assessment.passingScore !== null && (
                          <Badge className="rounded-md border-white/10 bg-white/5 text-[10px] font-semibold text-slate-300 hover:bg-white/5 px-2 py-0.5 pointer-events-none">
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

      <aside className="space-y-4">
        <Card className="sticky top-24 rounded-2xl border border-white/10 bg-gradient-to-br from-[#0e172e]/85 to-[#0b1329]/60 backdrop-blur-md shadow-xl">
          <CardHeader className="border-b border-white/5 p-5">
            <CardTitle className="text-base font-bold text-white">Campaign review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                Delivery mode
              </p>
              <div className="mt-3 grid gap-2">
                {(["in-person", "remote"] as const).map((mode) => {
                  const locked = mode !== "in-person";
                  return (
                    <button
                      key={mode}
                      type="button"
                      disabled={locked}
                      onClick={() => updateDraft("deliveryMode", mode)}
                      className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                        draft.deliveryMode === mode
                          ? "border-primary/40 bg-primary/10 text-white shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                          : "border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.05] hover:text-slate-300"
                      } ${locked ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      {mode.replace("-", " ")}
                      {locked && <Lock className="h-3.5 w-3.5 text-amber-400" />}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-amber-300/80">
                Remote is visible for planning, but locked until paid
                permissions are enabled.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
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
              <div className="mt-3 space-y-2">
                {selectedAssessments.length === 0 ? (
                  <p className="text-xs leading-normal text-slate-500 italic">
                    Select at least one assessment from the stack on the left.
                  </p>
                ) : (
                  selectedAssessments.map((assessment, index) => (
                    <div
                      key={assessment.slug}
                      className="rounded-xl border border-white/10 bg-white/[0.01] px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] text-slate-500 font-bold">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1 break-words text-xs font-bold text-slate-100">
                          {assessment.title}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          {assessment.duration}
                        </span>
                      </div>
                      {assessment.slug === "typing" && (
                        <div className="mt-3 space-y-2">
                          <Label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                            Typing level
                          </Label>
                          <div className="mt-2 grid gap-1.5">
                            {(["Base", "Intermediate", "Advanced"] as const).map((level) => {
                              const isActive = draft.typingDifficulty === level;
                              return (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={() => updateDraft("typingDifficulty", level)}
                                  className={`flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-300 ${
                                    isActive
                                      ? "border-primary/45 bg-primary/10 text-white shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                                      : "border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.05] hover:text-slate-300"
                                  }`}
                                >
                                  {level}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <div className="mt-3 space-y-2">
                        <Label
                          htmlFor={`weight-${assessment.slug}`}
                          className="text-[10px] uppercase font-bold tracking-wider text-slate-500"
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
                            className="h-9 border-white/10 bg-white/[0.02] text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
                          />
                          <span className="text-xs text-slate-400 font-bold mr-1">%</span>
                          
                          {draft.assessmentSlugs.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleLockSlug(assessment.slug)}
                              className={`h-9 w-9 shrink-0 rounded-lg transition-colors ${
                                lockedSlugs.includes(assessment.slug)
                                  ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300"
                                  : "bg-white/[0.02] text-slate-500 hover:bg-white/[0.05] hover:text-slate-400"
                              }`}
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
                  ))
                )}
              </div>
            </div>

            {selectedAssessments.length > 0 && (
              <div
                className={`rounded-xl border p-3.5 ${
                  assessmentWeightTotal === 100
                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
                    : "border-red-500/20 bg-red-500/5 text-red-300"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold">
                    Total weighting
                  </p>
                  <p
                    className={`text-base font-bold ${
                      assessmentWeightTotal === 100
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {assessmentWeightTotal}%
                  </p>
                </div>
                {assessmentWeightTotal !== 100 && (
                  <p className="mt-2 text-[10px] leading-relaxed text-red-400/80">
                    Weights must sum to 100% before the campaign can be created.
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
              className="h-10 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-primary text-sm font-semibold text-white transition-all duration-300 shadow-[0_4px_20px_rgba(99,102,241,0.15)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Creating..." : "Create campaign"}
            </Button>

            {savedMessage && (
              <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs leading-normal text-emerald-400">
                {savedMessage}
              </p>
            )}

            {errorMessage && (
              <p className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs leading-normal text-red-400">
                {errorMessage}
              </p>
            )}

          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
