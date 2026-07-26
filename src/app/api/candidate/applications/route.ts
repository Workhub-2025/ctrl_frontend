import { NextRequest, NextResponse } from "next/server";
import {
  handleBffRouteError,
} from "@/lib/auth/bff-session";
import { invalidateCandidateWorkspaceServerCache } from "@/lib/portal-cache-invalidation";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { rejectRateLimitedMutation } from "@/lib/security/api-rate-limit";
import { sanitiseAccessCode } from "@/lib/security/input-sanitization";
import { recruitmentIdempotencyKey } from "@/lib/firebase-recruitment-api";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";

/** Join a candidate application via access code. List applications via GET /api/candidate/workspace. */
export async function POST(request: NextRequest) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const { session, context: actor, recruitment } =
      await requireFirebaseRecruitmentSession("candidate");
    const rateLimited = await rejectRateLimitedMutation(request, {
      scope: "candidate:link-session",
      actorId: session.user.id,
      limit: 12,
      windowMs: 60_000,
    });
    if (rateLimited) return rateLimited;

    const payload = (await request.json()) as { accessCode?: string };
    const accessCode = sanitiseAccessCode(payload?.accessCode);

    if (!accessCode || accessCode.length < 4) {
      return NextResponse.json({ error: "Enter a valid access code" }, { status: 400 });
    }

    const data = await recruitment.linkAccessCode({
      accessCode,
      idempotencyKey: recruitmentIdempotencyKey(
        "candidate:link-session",
        actor.userId,
        { accessCode: accessCode.toLowerCase() },
      ),
    });
    void invalidateCandidateWorkspaceServerCache(actor.firebaseUid);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    return handleBffRouteError(error, "Could not link access code");
  }
}
