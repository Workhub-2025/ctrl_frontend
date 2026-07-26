import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HiringManagerCampaignBuilder } from "@/components/dashboard/hiring-manager-campaign-builder";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { portalAlertErrorClass } from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import { getHiringManagerAssessments } from "@/services/hiring-manager-assessments.service";
import { ArrowLeft, FolderPlus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CreateHiringManagerCampaignPage() {
  const { assessments, error } = await getHiringManagerAssessments({
    includeVersions: true,
  });

  // Delivery-mode entitlements move with billing (Chunk C). Firebase Preview
  // keeps remote/hybrid selectable so campaign create is not Strapi-blocked.
  const allowRemoteDelivery = true;
  const allowHybridDelivery = true;

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
