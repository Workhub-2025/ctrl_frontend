import { NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { createFirebaseClientPortalApi } from "@/lib/firebase-client-portal-api";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireFirebaseRecruitmentSession("client");
    const { id } = await context.params;
    const portal = createFirebaseClientPortalApi(
      auth.domainApi,
      auth.firebaseSessionCookie,
    );
    const data = await portal.getOutreachTemplates(id);
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Message templates could not be loaded");
  }
}
