import { redirect } from "next/navigation";

export const metadata = {
  title: "Candidate Portal",
};

export default function CandidateDashboardPage() {
  redirect("/candidate-dashboard/my-campaigns/");
}
