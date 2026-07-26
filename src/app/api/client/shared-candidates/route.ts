import { NextRequest, NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";
import { createFirebaseScreenApi } from "@/lib/firebase-screen-api";
import type { ClientSharedCandidate } from "@/services/client-portal.service";

export async function GET(request: NextRequest) {
  try {
    const { context, domainApi, firebaseSessionCookie } =
      await requireFirebaseRecruitmentSession("client");
    if (!context.organizationId) {
      return NextResponse.json(
        { error: "Organization membership is required" },
        { status: 403 },
      );
    }

    const requestedStatus =
      request.nextUrl.searchParams.get("reviewStatus") ?? undefined;
    const screens = createFirebaseScreenApi(domainApi, firebaseSessionCookie);
    const aggregate = await screens.getClientSharedCandidates();
    const data = (aggregate.items ?? []) as ClientSharedCandidate[];

    return NextResponse.json({
      data: requestedStatus
        ? data.filter((candidate) => candidate.reviewStatus === requestedStatus)
        : data,
    });
  } catch (error) {
    return handleBffRouteError(error, "Shared candidates could not be loaded");
  }
}
