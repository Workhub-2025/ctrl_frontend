import { NextRequest, NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";

type ReviewStatus =
  | "pending_review"
  | "reviewed"
  | "progressed"
  | "hired"
  | "rejected";

type ClientSharedCandidateDto = {
  documentId: string;
  reviewStatus: ReviewStatus;
  sharedAt?: string | null;
  reviewStatusChangedAt?: string | null;
  candidateName: string;
  candidateEmail?: string;
  hiringManagerName: string;
  campaignName: string;
  role: string;
};

function reviewStatus(
  decision?: "progress" | "hold" | "reject" | "hire" | "reopen",
): ReviewStatus {
  if (decision === "progress") return "progressed";
  if (decision === "hire") return "hired";
  if (decision === "reject") return "rejected";
  if (decision === "hold") return "reviewed";
  return "pending_review";
}

export async function GET(request: NextRequest) {
  try {
    const { context, recruitment } =
      await requireFirebaseRecruitmentSession("client");
    if (!context.organizationId) {
      return NextResponse.json(
        { error: "Organization membership is required" },
        { status: 403 },
      );
    }
    const requestedStatus =
      request.nextUrl.searchParams.get("reviewStatus") ?? undefined;
    const campaigns = await recruitment.listCampaigns(context.organizationId);
    const data = (
      await Promise.all(
        campaigns.items.map(async (campaign) => {
          const assignments = await recruitment.listAssignments(campaign.id);
          return Promise.all(
            assignments.items
              .filter((assignment) => assignment.visibility === "released")
              .map(async (assignment) => {
                const detail = await recruitment.getAssignment(assignment.id);
                const latestDecision = detail.decisions.at(0);
                const status = reviewStatus(latestDecision?.decision);
                const candidate: ClientSharedCandidateDto = {
                  documentId: assignment.id,
                  reviewStatus: status,
                  sharedAt: assignment.updatedAt,
                  reviewStatusChangedAt:
                    latestDecision?.createdAt ?? assignment.updatedAt,
                  candidateName: assignment.inviteEmail,
                  candidateEmail: assignment.inviteEmail,
                  hiringManagerName: campaign.ownerSeatId,
                  campaignName: campaign.title,
                  role: campaign.jobRole,
                };
                return candidate;
              }),
          );
        }),
      )
    ).flat();
    return NextResponse.json({
      data: requestedStatus
        ? data.filter((candidate) => candidate.reviewStatus === requestedStatus)
        : data,
    });
  } catch (error) {
    return handleBffRouteError(error, "Shared candidates could not be loaded");
  }
}
