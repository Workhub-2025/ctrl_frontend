import { CandidateShell } from "@/components/dashboard/candidate-shell";

export default function CandidateDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CandidateShell>{children}</CandidateShell>;
}
