import { AssessmentRecoveryWorkspace } from "@/components/admin/assessment-recovery-workspace";

export default function AdminAssessmentRecoveryPage() {
  return (
    <AssessmentRecoveryWorkspace
      scope="admin"
      showSearch
      title="Assessment recovery"
      description="Search abandoned attempts and review saved snapshots for audit."
    />
  );
}
