import { NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { buildClientOverview } from "@/lib/firebase-client-portal-api";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";

export async function GET() {
  try {
    const { context, domainApi, firebaseSessionCookie } =
      await requireFirebaseRecruitmentSession("client");
    if (!context.organizationId) {
      return NextResponse.json(
        { error: "Organization membership is required" },
        { status: 403 },
      );
    }
    const overview = await buildClientOverview(
      domainApi,
      firebaseSessionCookie,
      context.organizationId,
    );
    return NextResponse.json({ data: overview });
  } catch (error) {
    return handleBffRouteError(error, "Client overview could not be loaded");
  }
}
