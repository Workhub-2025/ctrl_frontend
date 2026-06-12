import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HiringManagerCampaignBuilder } from "@/components/dashboard/hiring-manager-campaign-builder";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { getHiringManagerAssessments } from "@/services/hiring-manager-assessments.service";
import { ArrowLeft, ClipboardList, FolderPlus, Weight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CreateHiringManagerCampaignPage() {
  const { assessments, error } = await getHiringManagerAssessments();

  let allowExtremePja = true;
  let allowAdvancedPja = false;
  let allowTypingIntermediate = true;
  let allowTypingAdvanced = false;

  try {
    const { getServerStrapiClient } = await import("@/lib/strapi");
    const strapiClient = await getServerStrapiClient();
    const meResponse = await strapiClient.fetch("/users/me?populate=client");
    if (meResponse.ok) {
      const userData = await meResponse.json();
      const features = userData?.client?.features ?? {};
      allowExtremePja = features.extremePja !== false;
      allowAdvancedPja = features.advancedPja === true;
      allowTypingIntermediate = features.typingIntermediate !== false;
      allowTypingAdvanced = features.typingAdvanced === true;
    }
  } catch (err) {
    console.error("[CreateHiringManagerCampaignPage] Failed to fetch client features", err);
  }

  return (
    <div className="max-w-7xl space-y-6">
      <HiringManagerPageHeader
        eyebrow="Campaign creation"
        title="Create campaign"
        description="Configure the campaign details, choose the assessment stack, and set the weighting before candidates join."
        icon={FolderPlus}
        notice={
          error ? (
            <p className="max-w-3xl rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-700 dark:text-amber-100">
              {error}
            </p>
          ) : null
        }
        action={
          <Button variant="outline" asChild>
            <Link href="/hiring-manager-dashboard/campaigns/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to campaigns
            </Link>
          </Button>
        }
      />

      <HiringManagerCampaignBuilder
        assessments={assessments}
        allowExtremePja={allowExtremePja}
        allowAdvancedPja={allowAdvancedPja}
        allowTypingIntermediate={allowTypingIntermediate}
        allowTypingAdvanced={allowTypingAdvanced}
      />
    </div>
  );
}
