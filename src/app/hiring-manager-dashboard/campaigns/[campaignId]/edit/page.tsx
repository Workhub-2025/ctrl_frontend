import { HiringManagerCampaignEditView } from "@/components/dashboard/hiring-manager-campaign-edit-view";
import { getHiringManagerAssessments } from "@/services/hiring-manager-assessments.service";

export const dynamic = "force-dynamic";

type HiringManagerCampaignEditPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

export default async function HiringManagerCampaignEditPage({
  params,
}: HiringManagerCampaignEditPageProps) {
  const { campaignId } = await params;
  const { assessments, error } = await getHiringManagerAssessments({
    includeVersions: true,
  });

  // Delivery-mode entitlements move with billing (Chunk C).
  const allowRemoteDelivery = true;
  const allowHybridDelivery = true;

  if (error) {
    return (
      <div className="rounded-lg border border-red-400/20 bg-red-400/10 p-6 text-sm text-red-100">
        {error}
      </div>
    );
  }

  return (
    <HiringManagerCampaignEditView
      campaignId={campaignId}
      assessments={assessments}
      allowRemoteDelivery={allowRemoteDelivery}
      allowHybridDelivery={allowHybridDelivery}
    />
  );
}
