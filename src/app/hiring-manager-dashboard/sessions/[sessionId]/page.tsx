import { redirect } from "next/navigation";

type HiringManagerSessionPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function HiringManagerSessionPage({
  params,
}: HiringManagerSessionPageProps) {
  const { sessionId } = await params;
  redirect(`/hiring-manager-dashboard/campaigns?tab=sessions&session=${encodeURIComponent(sessionId)}`);
}
