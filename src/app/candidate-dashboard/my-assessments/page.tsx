import { redirect } from "next/navigation";

export const metadata = {
  title: "My Campaigns",
};

export default function MyAssessmentsPage() {
  redirect("/candidate-dashboard/my-campaigns/");
}
