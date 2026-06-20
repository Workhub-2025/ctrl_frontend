import { HiringManagerCandidateReport } from "@/components/dashboard/hiring-manager-candidate-report";

type HiringManagerCandidateReportPageProps = {
  params: Promise<{ candidateSessionId: string }>;
  searchParams: Promise<{ candidateSessionId?: string }>;
};

export default async function HiringManagerCandidateReportPage({
  params,
  searchParams,
}: HiringManagerCandidateReportPageProps) {
  const { candidateSessionId: candidateSessionIdParam } = await params;
  const { candidateSessionId } = await searchParams;
  const resolvedCandidateSessionId = candidateSessionId ?? candidateSessionIdParam;

  return (
    <HiringManagerCandidateReport
      candidateId={resolvedCandidateSessionId}
      candidateSessionId={resolvedCandidateSessionId}
    />
  );
}
