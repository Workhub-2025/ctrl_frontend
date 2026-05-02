import { ProtectedLayout } from "@/components/auth/protected-layout";

export default function AssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout deliberately removes any Dashboard Shells or Sidebars
  // so the SecureAssessmentShell can take over the entire popup window cleanly.
  return <ProtectedLayout>{children}</ProtectedLayout>;
}