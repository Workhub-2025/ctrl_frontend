import { CandidateDashboardContent } from "@/components/dashboard/candidate-dashboard-content";

export const metadata = {
  title: "Candidate Dashboard",
};

export default async function CandidateDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ completed?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <CandidateDashboardContent completedKey={resolvedSearchParams?.completed} />
  );
}
