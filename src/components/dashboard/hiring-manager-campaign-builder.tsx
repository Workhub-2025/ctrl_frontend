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
  prioritization: BrainCircuit,
  default: BrainCircuit,
} satisfies Record<HiringManagerAssessment["iconKey"], typeof BrainCircuit>;

type CampaignDraft = {
  campaignName: string;
  roleTitle: string;
  location: string;
  deliveryMode: "in-person" | "remote" | "hybrid";
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
  candidateVolume: "",
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

  const toggleAssessment = (slug: string) => {
    setDraft((current) => {
      const exists = current.assessmentSlugs.includes(slug);
      const assessmentSlugs = exists
        ? current.assessmentSlugs.filter((item) => item !== slug)
        : [...current.assessmentSlugs, slug];
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
    setDraft((current) => ({
      ...current,
      assessmentWeights: {
        ...current.assessmentWeights,
        [slug]: Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, 100)) : 0,
      },
    }));
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
              : draft.deliveryMode === "hybrid"
                ? "hybrid"
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
        <Card className="rounded-lg border border-white/10 bg-[#0b1220] shadow-none">
          <CardHeader className="border-b border-white/10 p-4">
            <CardTitle className="text-base text-white">Campaign details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="campaignName" className="text-slate-200">
                Campaign name
              </Label>
              <Input
                id="campaignName"
                value={draft.campaignName}
                onChange={(event) => updateDraft("campaignName", event.target.value)}
                placeholder="e.g. Spring control room intake"
                className="border-white/10 bg-[#08101d] text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleTitle" className="text-slate-200">
                Role title
              </Label>
              <Input
                id="roleTitle"
                value={draft.roleTitle}
                onChange={(event) => updateDraft("roleTitle", event.target.value)}
                placeholder="Emergency call handler"
                className="border-white/10 bg-[#08101d] text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location" className="text-slate-200">
                Location
              </Label>
              <Input
                id="location"
                value={draft.location}
                onChange={(event) => updateDraft("location", event.target.value)}
                placeholder="Assessment centre or operational area"
                className="border-white/10 bg-[#08101d] text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="candidateVolume" className="text-slate-200">
                Expected candidates
              </Label>
              <Input
                id="candidateVolume"
                type="number"
                min="1"
                value={draft.candidateVolume}
                onChange={(event) =>
                  updateDraft("candidateVolume", event.target.value)
                }
                placeholder="Number of candidates"
                className="border-white/10 bg-[#08101d] text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-slate-200">
                Planned start
              </Label>
              <Input
                id="startDate"
                type="date"
                value={draft.startDate}
                onChange={(event) => updateDraft("startDate", event.target.value)}
                className="border-white/10 bg-[#08101d] text-slate-100"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes" className="text-slate-200">
                Operational notes
              </Label>
              <Textarea
                id="notes"
                value={draft.notes}
                onChange={(event) => updateDraft("notes", event.target.value)}
                placeholder="Optional notes for recruiters, assessors, or session planning."
                className="min-h-24 border-white/10 bg-[#08101d] text-slate-100 placeholder:text-slate-500"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-white/10 bg-[#0b1220] shadow-none">
          <CardHeader className="border-b border-white/10 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base text-white">
                Assessment stack
              </CardTitle>
              <Badge className="w-fit rounded-md border-sky-400/20 bg-sky-400/10 text-xs text-sky-100 hover:bg-sky-400/10">
                {assessments.length} active from backend
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {assessments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">
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
                    className={`rounded-lg border p-3 text-left transition ${
                      checked
                        ? "border-sky-300/30 bg-sky-400/[0.08]"
                        : "border-white/10 bg-white/[0.03] hover:border-sky-300/30 hover:bg-sky-400/[0.06]"
                    }`}
                  >
                    <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-start">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleAssessment(assessment.slug)}
                        onClick={(event) => event.stopPropagation()}
                        className="mt-1 border-white/30 data-[state=checked]:border-sky-300 data-[state=checked]:bg-sky-400"
                        aria-label={`Select ${assessment.title}`}
                      />
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-sky-400/20 bg-sky-400/10 text-sky-200">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="break-words text-sm font-semibold leading-5 text-white">
                              {assessment.title}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {assessment.skills.slice(0, 3).join(" · ")}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-slate-400">
                          {assessment.summary}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <Badge className="rounded-md border-white/10 bg-white/5 text-xs text-slate-300 hover:bg-white/5">
                          {assessment.duration}
                        </Badge>
                        {assessment.passingScore !== null && (
                          <Badge className="rounded-md border-white/10 bg-white/5 text-xs text-slate-300 hover:bg-white/5">
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
        <Card className="sticky top-24 rounded-lg border border-white/10 bg-[#0b1220] shadow-none">
          <CardHeader className="border-b border-white/10 p-4">
            <CardTitle className="text-base text-white">Campaign review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Delivery mode
              </p>
              <div className="mt-3 grid gap-2">
                {(["in-person", "remote", "hybrid"] as const).map((mode) => {
                  const locked = mode !== "in-person";
                  return (
                    <button
                      key={mode}
                      type="button"
                      disabled={locked}
                      onClick={() => updateDraft("deliveryMode", mode)}
                      className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm capitalize ${
                        draft.deliveryMode === mode
                          ? "border-sky-300/40 bg-sky-400/10 text-sky-100"
                          : "border-white/10 bg-white/[0.03] text-slate-300"
                      } ${locked ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      {mode.replace("-", " ")}
                      {locked && <Lock className="h-3.5 w-3.5 text-amber-200" />}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs leading-5 text-amber-100">
                Remote and hybrid are visible for planning, but locked until paid
                permissions are enabled.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Selected stack
              </p>
              <div className="mt-3 space-y-2">
                {selectedAssessments.length === 0 ? (
                  <p className="text-sm leading-6 text-slate-400">
                    Select at least one assessment from Strapi.
                  </p>
                ) : (
                  selectedAssessments.map((assessment, index) => (
                    <div
                      key={assessment.slug}
                      className="rounded-md border border-white/10 bg-[#08101d] px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-500">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1 break-words text-sm text-slate-100">
                          {assessment.title}
                        </span>
                        <span className="text-xs text-slate-500">
                          {assessment.duration}
                        </span>
                      </div>
                      {assessment.slug === "typing" && (
                        <div className="mt-3 space-y-2">
                          <Label className="text-xs text-slate-400">
                            Typing level
                          </Label>
                          <Select
                            value={draft.typingDifficulty}
                            onValueChange={(value) =>
                              updateDraft(
                                "typingDifficulty",
                                value as CampaignDraft["typingDifficulty"]
                              )
                            }
                          >
                            <SelectTrigger className="h-9 border-white/10 bg-white/[0.03] text-slate-100">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Base">Base</SelectItem>
                              <SelectItem value="Intermediate">Intermediate</SelectItem>
                              <SelectItem value="Advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="mt-3 space-y-2">
                        <Label
                          htmlFor={`weight-${assessment.slug}`}
                          className="text-xs text-slate-400"
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
                            onChange={(event) =>
                              updateAssessmentWeight(
                                assessment.slug,
                                event.target.value
                              )
                            }
                            className="h-9 border-white/10 bg-white/[0.03] text-slate-100"
                          />
                          <span className="text-sm text-slate-400">%</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedAssessments.length > 0 && (
              <div
                className={`rounded-lg border p-3 ${
                  assessmentWeightTotal === 100
                    ? "border-emerald-400/20 bg-emerald-400/10"
                    : "border-red-400/20 bg-red-400/10"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">
                    Total assessment weighting
                  </p>
                  <p
                    className={`text-lg font-semibold ${
                      assessmentWeightTotal === 100
                        ? "text-emerald-100"
                        : "text-red-100"
                    }`}
                  >
                    {assessmentWeightTotal}%
                  </p>
                </div>
                {assessmentWeightTotal !== 100 && (
                  <p className="mt-2 text-xs leading-5 text-red-100">
                    Assessment weights must equal 100% overall before you can
                    create the campaign.
                  </p>
                )}
              </div>
            )}

            <div className="rounded-lg border border-sky-400/20 bg-sky-400/10 p-3">
              <div className="flex items-center gap-2 text-sky-100">
                <ShieldCheck className="h-4 w-4" />
                <p className="text-sm font-medium">Estimated assessment time</p>
              </div>
              <p className="mt-2 text-2xl font-semibold text-white">
                {formatTotalDuration(totalDurationSeconds)}
              </p>
            </div>

            <Button
              type="button"
              disabled={!hasRequiredSetup || isSaving}
              onClick={saveDraft}
              className="h-10 w-full rounded-md bg-sky-500 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Creating..." : "Create campaign"}
            </Button>

            {savedMessage && (
              <p className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs leading-5 text-emerald-100">
                {savedMessage}
              </p>
            )}

            {errorMessage && (
              <p className="rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs leading-5 text-red-100">
                {errorMessage}
              </p>
            )}

          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
