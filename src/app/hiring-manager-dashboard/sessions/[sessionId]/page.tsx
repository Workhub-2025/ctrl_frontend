import { HiringManagerSessionDetailView } from "@/components/dashboard/hiring-manager-session-detail-view";

type HiringManagerSessionPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function HiringManagerSessionPage({
  params,
}: HiringManagerSessionPageProps) {
  const { sessionId } = await params;

  return <HiringManagerSessionDetailView sessionId={sessionId} />;
}
