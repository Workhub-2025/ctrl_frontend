"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { HiringManagerCampaignBuilder } from "@/components/dashboard/hiring-manager-campaign-builder";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { portalAlertErrorClass, portalPanelNestedClass } from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import type { HiringManagerAssessment } from "@/services/hiring-manager-assessments.service";
import {
  HiringManagerPortalClientService,
  type HiringManagerCampaignDetail,
} from "@/services/hiring-manager-portal-client.service";
import { ArrowLeft, Pencil } from "lucide-react";

const DEFAULT_ASSESSMENT_VERSION = "1.0.0";

function deliveryModeFromCampaign(
  mode: HiringManagerCampaignDetail["deliveryMode"]
): "in_person" | "remote" | "hybrid" {
  switch (mode) {
    case "Remote":
      return "remote";
    case "Hybrid":
      return "hybrid";
    default:
      return "in_person";
  }
}

type HiringManagerCampaignEditViewProps = {
  campaignId: string;
  assessments: HiringManagerAssessment[];
  allowRemoteDelivery?: boolean;
  allowHybridDelivery?: boolean;
};

function buildInitialStackDraft(campaign: HiringManagerCampaignDetail) {
  const settings = (campaign.assessmentSettings ?? {}) as Record<string, unknown>;
  const weights = (settings.weights as Record<string, number> | undefined) ?? {};
  const assessmentSlugs = campaign.linkedAssessmentSlugs ?? [];

  const assessmentVersions = assessmentSlugs.reduce<Record<string, string>>((acc, slug) => {
    const config = settings[slug];
    const version =
      config && typeof config === "object" && "version" in config
        ? String((config as { version?: unknown }).version ?? DEFAULT_ASSESSMENT_VERSION)
        : DEFAULT_ASSESSMENT_VERSION;
    acc[slug] = version;
    return acc;
  }, {});

  const typingConfig = settings.typing;
  const typingDifficulty =
    typingConfig &&
    typeof typingConfig === "object" &&
    "difficulty" in typingConfig &&
    typeof (typingConfig as { difficulty?: unknown }).difficulty === "string"
      ? ((typingConfig as { difficulty: string }).difficulty as "Base" | "Intermediate" | "Extreme")
      : "Base";

  const prioritisationConfig = settings.prioritisation;
  const rawPrioritisationScoringMode =
    prioritisationConfig &&
    typeof prioritisationConfig === "object" &&
    "scoringMode" in prioritisationConfig &&
    typeof (prioritisationConfig as { scoringMode?: unknown }).scoringMode === "string"
      ? (prioritisationConfig as { scoringMode: string }).scoringMode
      : "Basic";
  const prioritisationScoringMode: "Basic" | "Advanced" =
    rawPrioritisationScoringMode === "Advanced" ? "Advanced" : "Basic";

  return {
    assessmentSlugs,
    assessmentWeights:
      Object.keys(weights).length > 0
        ? weights
        : assessmentSlugs.reduce<Record<string, number>>((acc, slug, index, slugs) => {
            const baseWeight = Math.floor(100 / slugs.length);
            const remainder = 100 - baseWeight * slugs.length;
            acc[slug] = baseWeight + (index < remainder ? 1 : 0);
            return acc;
          }, {}),
    assessmentVersions,
    typingDifficulty,
    prioritisationScoringMode,
    deliveryMode: deliveryModeFromCampaign(campaign.deliveryMode),
  };
}

export function HiringManagerCampaignEditView({
  campaignId,
  assessments,
  allowRemoteDelivery = false,
  allowHybridDelivery = false,
}: HiringManagerCampaignEditViewProps) {
  const [campaign, setCampaign] = useState<HiringManagerCampaignDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await HiringManagerPortalClientService.getCampaignDetail(campaignId, {
          force: true,
        });
        if (!cancelled) {
          setCampaign(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Campaign could not be loaded."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const initialStackDraft = useMemo(
    () => (campaign ? buildInitialStackDraft(campaign) : null),
    [campaign]
  );

  if (isLoading) {
    return (
      <div className={cn(portalPanelNestedClass, "p-6 text-sm text-muted-foreground")}>
        Loading campaign...
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-4">
        <Button variant="outline" asChild>
          <Link href={`/hiring-manager-dashboard/campaigns/${campaignId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to campaign
          </Link>
        </Button>
        <div className={cn(portalAlertErrorClass, "p-4 text-sm")}>
          {error || "Campaign could not be loaded."}
        </div>
      </div>
    );
  }

  if (campaign.sessions > 0) {
    return (
      <div className="max-w-3xl space-y-4">
        <Button variant="outline" asChild>
          <Link href={`/hiring-manager-dashboard/campaigns/${campaignId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to campaign
          </Link>
        </Button>
        <div className={cn(portalAlertErrorClass, "p-4 text-sm leading-relaxed")}>
          Delete all sessions before editing the assessment stack for this campaign.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl space-y-6">
      <HiringManagerPageHeader
        eyebrow="Campaign editing"
        title={`Edit ${campaign.name}`}
        description="Update delivery mode, assessment stack, and weighting. Other campaign details stay unchanged."
        icon={Pencil}
        action={
          <Button variant="outline" asChild>
            <Link href={`/hiring-manager-dashboard/campaigns/${campaignId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to campaign
            </Link>
          </Button>
        }
      />

      {initialStackDraft ? (
        <HiringManagerCampaignBuilder
          mode="edit-stack"
          campaignId={campaignId}
          initialStackDraft={initialStackDraft}
          assessments={assessments}
          allowRemoteDelivery={allowRemoteDelivery}
          allowHybridDelivery={allowHybridDelivery}
        />
      ) : null}
    </div>
  );
}
