import type { HiringManagerCampaignListItem } from "@/services/hiring-manager-portal-client.service";

type CampaignApprovalStatus = HiringManagerCampaignListItem["approvalStatus"];

/** Deleting a campaign archives it; its candidates and audit trail remain. */
export function isArchivedCampaign(
  campaign: Pick<HiringManagerCampaignListItem, "status">
): boolean {
  return campaign.status === "Archived";
}

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
