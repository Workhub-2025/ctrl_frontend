import { Suspense } from "react";
import {
  CandidateAssessmentsLoadingSkeleton,
  CandidateDashboardContent,
} from "@/components/dashboard/candidate-dashboard-content";
import { CandidatePortalProvider } from "@/context/candidate-portal-provider";

export const metadata = {
  title: "My Assessments",
};

export default function CandidateDashboardOverviewPage() {
  return (
    <CandidatePortalProvider>
      <Suspense fallback={<CandidateAssessmentsLoadingSkeleton />}>
        <CandidateDashboardContent />
      </Suspense>
    </CandidatePortalProvider>
  );
}
