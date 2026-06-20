import { HiringManagerCandidateReport } from "@/components/dashboard/hiring-manager-candidate-report";

type HiringManagerCandidateReportPageProps = {
  params: Promise<{ candidateId: string }>;
  searchParams: Promise<{ candidateSessionId?: string }>;
};

export default async function HiringManagerCandidateReportPage({
  params,
  searchParams,
}: HiringManagerCandidateReportPageProps) {
  const { candidateId } = await params;
  const { candidateSessionId } = await searchParams;
  return (
    <HiringManagerCandidateReport
      candidateId={candidateId}
      candidateSessionId={candidateSessionId}
    />
  );
}
