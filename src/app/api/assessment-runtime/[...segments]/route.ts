import { NextRequest, NextResponse } from "next/server";
import { forwardFirebaseAssessmentRuntime } from "@/lib/firebase-assessment-runtime-server";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { isSupportedAssessmentDeviceRequest } from "@/lib/assessment-device-eligibility";
import { invalidateAfterAssessmentSubmit } from "@/lib/portal-cache-invalidation";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

type RouteContext = { params: Promise<{ segments: string[] }> };

type SubmitReceipt = {
  data?: {
    receiptId?: string;
    status?: string;
    submittedAt?: string;
    assignmentId?: string;
    organizationId?: string;
    campaignId?: string;
  };
};

function allowed(method: string, segments: string[]) {
  const path = segments.join("/");
  if (method === "GET") {
    return path === "readiness" || /^attempts\/[^/]+\/status$/.test(path);
  }
  if (method === "POST") {
    return path === "start" || /^attempts\/[^/]+\/(heartbeat|events|submit|restart|resume)$/.test(path);
  }
  return method === "PATCH" && /^attempts\/[^/]+\/progress$/.test(path);
}

async function handle(request: NextRequest, context: RouteContext) {
  try {
    const { segments } = await context.params;
    if (!allowed(request.method, segments)) {
      return NextResponse.json({ error: "Assessment runtime route not found" }, { status: 404 });
    }
    if (request.method !== "GET") {
      const rejected = rejectMutatingCrossOrigin(request);
      if (rejected) return rejected;
    }
    const path = segments.join("/");
    const launchesAttempt =
      request.method === "POST" &&
      (path === "start" || /^attempts\/[^/]+\/restart$/.test(path));
    if (launchesAttempt && !isSupportedAssessmentDeviceRequest(request.headers)) {
      return NextResponse.json(
        {
          error:
            "Assessments require a desktop or laptop with a physical keyboard.",
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const query = request.nextUrl.search;
    const body = ["POST", "PATCH"].includes(request.method) ? await request.text() : undefined;
    const result = await forwardFirebaseAssessmentRuntime(
      request,
      `/assessment-runtime/${segments.map(encodeURIComponent).join("/")}${query}`,
      { method: request.method, ...(body ? { body } : {}) }
    );

    if (
      request.method === "POST" &&
      /^attempts\/[^/]+\/submit$/.test(path) &&
      result.status >= 200 &&
      result.status < 300
    ) {
      const receipt = result.body as SubmitReceipt;
      const organizationId = receipt.data?.organizationId;
      if (organizationId) {
        void invalidateAfterAssessmentSubmit({
          candidateFirebaseUid: result.firebaseUid,
          organizationId,
          assignmentId: receipt.data?.assignmentId ?? null,
        });
      } else {
        const { invalidateCandidateWorkspaceServerCache } = await import(
          "@/lib/portal-cache-invalidation"
        );
        void invalidateCandidateWorkspaceServerCache(result.firebaseUid);
      }
    }

    return NextResponse.json(result.body, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return handleBffRouteError(error, "Assessment request failed");
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
