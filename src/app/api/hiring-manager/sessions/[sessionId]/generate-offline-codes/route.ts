import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    await requireFirebaseRecruitmentSession("hiring_manager");

    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    await context.params;
    return NextResponse.json(
      {
        error:
          "Offline candidate codes have been retired. Invite named candidates or use the session access code.",
      },
      { status: 410 },
    );
  } catch (error) {
    return handleBffRouteError(error, "Offline codes could not be generated");
  }
}
