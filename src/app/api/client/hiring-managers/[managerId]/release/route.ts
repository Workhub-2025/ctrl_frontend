import { NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { requireFirebaseTenancySession } from "@/lib/firebase-tenancy-bff";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

export async function POST(
  request: Request,
  context: { params: Promise<{ managerId: string }> },
) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const { managerId } = await context.params;
    const { context: authContext, tenancy } =
      await requireFirebaseTenancySession("client");
    if (!authContext.organizationId) {
      return NextResponse.json(
        { error: "Organisation membership is required" },
        { status: 403 },
      );
    }

    const released = await tenancy.releaseSeatMembership(
      authContext.organizationId,
      managerId,
    );
    return NextResponse.json({
      data: {
        documentId: managerId,
        blocked: true,
        releasedSeatId: released.seatId,
        alreadyReleased: released.alreadyReleased,
      },
    });
  } catch (error) {
    return handleBffRouteError(error, "Hiring manager could not be released");
  }
}
