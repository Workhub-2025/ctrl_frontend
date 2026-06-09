import { Suspense } from "react";
import { CandidateDashboardContent } from "@/components/dashboard/candidate-dashboard-content";

export const metadata = {
  title: "My Assessments",
};

export default function MyAssessmentsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CandidateDashboardContent />
    </Suspense>
  );
}
