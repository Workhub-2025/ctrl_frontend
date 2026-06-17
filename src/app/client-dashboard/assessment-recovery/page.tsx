import { AssessmentRecoveryWorkspace } from "@/components/admin/assessment-recovery-workspace";

export default function ClientAssessmentRecoveryPage() {
  return (
    <AssessmentRecoveryWorkspace
      scope="portal"
      title="Assessment recovery"
      description="Review abandoned assessments across your organisation and unlock candidates when appropriate."
    />
  );
}
