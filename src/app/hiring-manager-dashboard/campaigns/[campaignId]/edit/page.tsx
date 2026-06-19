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
    console.error("[HiringManagerCampaignEditPage] Failed to fetch client features", err);
  }

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
