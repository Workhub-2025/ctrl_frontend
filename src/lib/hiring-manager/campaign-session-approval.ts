import type { HiringManagerCampaignListItem } from "@/services/hiring-manager-portal-client.service";

type CampaignApprovalStatus = HiringManagerCampaignListItem["approvalStatus"];

export function canCreateSessionForCampaign(
  approvalStatus: CampaignApprovalStatus
): boolean {
  return approvalStatus === "Approved";
}

export function getSessionCreationApprovalError(
  approvalStatus: CampaignApprovalStatus
): string | null {
  if (approvalStatus === "Approved") return null;

  return approvalStatus === "Rejected"
    ? "This campaign was rejected and cannot accept sessions."
    : "This campaign must be approved by the client before a session can be created.";
}
