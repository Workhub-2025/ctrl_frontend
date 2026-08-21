import { NextRequest, NextResponse } from "next/server";
import { handleBffRouteError } from "@/lib/auth/bff-session";
import {
  requireFirebaseRecruitmentSession,
  toClientCampaign,
} from "@/lib/firebase-recruitment-bff";

export async function GET(request: NextRequest) {
  try {
    const { context, recruitment } =
      await requireFirebaseRecruitmentSession("client");
    if (!context.organizationId) {
      return NextResponse.json({ error: "Organisation membership is required" }, { status: 403 });
    }
    const status = request.nextUrl.searchParams.get("status");
    if (status && !["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "status must be pending, approved, or rejected" },
        { status: 400 }
      );
    }
    const result = await recruitment.listCampaigns(context.organizationId);
    const firebaseStatus =
      status === "pending" ? "pending_review" : status;
    const data = result.items
      .filter((campaign) => !firebaseStatus || campaign.status === firebaseStatus)
      .map((campaign) => toClientCampaign(campaign));
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Campaigns could not be loaded");
  }
}
