import { Suspense } from "react";
import { CandidateDashboardContent } from "@/components/dashboard/candidate-dashboard-content";

export const metadata = {
  title: "My Campaigns",
};

export default function MyCampaignsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CandidateDashboardContent />
    </Suspense>
  );
}
