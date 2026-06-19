import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HiringManagerCampaignBuilder } from "@/components/dashboard/hiring-manager-campaign-builder";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { portalAlertErrorClass } from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import { getHiringManagerAssessments } from "@/services/hiring-manager-assessments.service";
import { ArrowLeft, ClipboardList, FolderPlus, Weight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CreateHiringManagerCampaignPage() {
  const { assessments, error } = await getHiringManagerAssessments();

  let allowRemoteDelivery = false;
  let allowHybridDelivery = false;

  try {
    const { getServerStrapiClient } = await import("@/lib/strapi");
    const strapiClient = await getServerStrapiClient();
    const meResponse = await strapiClient.fetch("/users/me?populate=client");
    if (meResponse.ok) {
      const userData = await meResponse.json();
      const features = userData?.client?.features ?? {};
      allowRemoteDelivery = features.deliveryRemote === true;
      allowHybridDelivery = features.deliveryHybrid === true;
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
            <p className={cn(portalAlertErrorClass, "max-w-3xl text-xs leading-5")}>
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
        allowRemoteDelivery={allowRemoteDelivery}
        allowHybridDelivery={allowHybridDelivery}
      />
    </div>
  );
}
