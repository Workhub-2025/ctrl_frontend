import { Suspense } from "react";
import {
  CandidateAssessmentsLoadingSkeleton,
  CandidateDashboardContent,
} from "@/components/dashboard/candidate-dashboard-content";

export const metadata = {
  title: "My Assessments",
};

export default function CandidateDashboardOverviewPage() {
  return (
    <Suspense fallback={<CandidateAssessmentsLoadingSkeleton />}>
      <CandidateDashboardContent />
    </Suspense>
  );
}
