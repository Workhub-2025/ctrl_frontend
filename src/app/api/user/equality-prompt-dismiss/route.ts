import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { createDomainApi } from "@/lib/domain-api";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

export async function POST(request: NextRequest) {
  try {
    const rejected = rejectMutatingCrossOrigin(request);
    if (rejected) return rejected;

    const auth = await requireFirebaseSession();
    const domainApi = createDomainApi();
    const data = await domainApi.request({
      path: "/v1/profile/equality-prompt-dismiss",
      method: "POST",
      firebaseSessionCookie: auth.firebaseSessionCookie,
      body: {},
    });
    return NextResponse.json(data);
  } catch (error) {
    return handleBffRouteError(error, "Equality prompt could not be dismissed");
  }
}
