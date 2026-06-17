import { AssessmentRecoveryWorkspace } from "@/components/admin/assessment-recovery-workspace";

export default function HiringManagerAssessmentRecoveryPage() {
  return (
    <AssessmentRecoveryWorkspace
      scope="portal"
      title="Assessment recovery"
      description="Review abandoned assessments in your campaigns and unlock candidates after verifying the request."
    />
  );
}
