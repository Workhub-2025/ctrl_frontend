import { HiringManagerCampaignDetailView } from "@/components/dashboard/hiring-manager-campaign-detail";

type HiringManagerCampaignDetailPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

export default async function HiringManagerCampaignDetailPage({
  params,
}: HiringManagerCampaignDetailPageProps) {
  const { campaignId } = await params;

  return <HiringManagerCampaignDetailView campaignId={campaignId} />;
}
