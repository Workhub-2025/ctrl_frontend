import { AssessmentRecoveryWorkspace } from "@/components/admin/assessment-recovery-workspace";

export default function AdminAssessmentRecoveryPage() {
  return (
    <AssessmentRecoveryWorkspace
      scope="admin"
      showSearch
      showForceAbandon
      title="Assessment recovery"
      description="Search abandoned attempts, review snapshots, recover candidates, or force-abandon edge cases."
    />
  );
}
