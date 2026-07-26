import { HiringManagerSessionDetailView } from "@/components/dashboard/hiring-manager-session-detail-view";

export default async function CampaignSessionDetailPage({
  params,
}: Readonly<{
  params: Promise<{ campaignId: string; sessionId: string }>;
}>) {
  const { sessionId } = await params;
  return <HiringManagerSessionDetailView sessionId={sessionId} />;
}
