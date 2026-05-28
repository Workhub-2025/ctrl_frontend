import { HiringManagerCandidateReport } from "@/components/dashboard/hiring-manager-candidate-report";

type HiringManagerCandidateReportPageProps = {
  params: Promise<{ candidateId: string }>;
};

export default async function HiringManagerCandidateReportPage({
  params,
}: HiringManagerCandidateReportPageProps) {
  const { candidateId } = await params;
  return <HiringManagerCandidateReport candidateId={candidateId} />;
}
