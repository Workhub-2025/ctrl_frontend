import { HiringManagerCandidateReport } from "@/components/dashboard/hiring-manager-candidate-report";

type HiringManagerCandidateReportPageProps = {
  params: Promise<{ candidateId: string }>;
  searchParams: Promise<{ campaignId?: string }>;
};

export default async function HiringManagerCandidateReportPage({
  params,
  searchParams,
}: HiringManagerCandidateReportPageProps) {
  const { candidateId } = await params;
  const { campaignId } = await searchParams;
  return <HiringManagerCandidateReport candidateId={candidateId} campaignId={campaignId} />;
}
