import { ClientCampaignDetail } from "@/components/dashboard/client/client-campaign-detail";

export default async function ClientCampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  return <ClientCampaignDetail campaignId={campaignId} />;
}
