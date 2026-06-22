import { AssessmentRecoveryWorkspace } from "@/components/admin/assessment-recovery-workspace";
import { PlatformCatalogueSyncPanel } from "@/components/admin/platform-catalogue-sync-panel";

export default function AdminAssessmentRecoveryPage() {
  return (
    <div className="space-y-8">
      <PlatformCatalogueSyncPanel />
      <AssessmentRecoveryWorkspace
        scope="admin"
        showSearch
        title="Assessment recovery"
        description="Search abandoned attempts and review saved snapshots for audit."
      />
    </div>
  );
}
