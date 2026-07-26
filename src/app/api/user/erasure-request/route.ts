import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { resolveCorrelationId, startServerActionTrace } from "@/lib/observability/server-observability";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

export async function POST(request: NextRequest) {
  const correlationId = resolveCorrelationId(
    request.headers.get("x-correlation-id"),
  );
  const trace = startServerActionTrace("user.erasure-request", { correlationId });

  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const auth = await requireFirebaseSession();
    const limiter = await applyRateLimit({
      key: `user:erasure:${auth.session.user.id}:${extractClientIp(request)}`,
      limit: 3,
      windowMs: 24 * 60 * 60_000,
    });
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many erasure requests. Please contact support." },
        {
          status: 429,
          headers: {
            "x-correlation-id": correlationId,
            "retry-after": String(limiter.retryAfterSeconds),
          },
        },
      );
    }

    const data = await auth.domainApi.request<{
      status: string;
      message: string;
      requestId: string;
      processedAt: string;
    }>({
      path: "/v1/privacy/me/erasure-request",
      method: "POST",
      firebaseSessionCookie: auth.firebaseSessionCookie,
      body: {},
    });

    trace.success({ userId: auth.session.user.id, status: data.status });
    return NextResponse.json(
      { data },
      { headers: { "x-correlation-id": correlationId } },
    );
  } catch (error: unknown) {
    trace.failure(
      error instanceof Error ? error : new Error("Erasure request failed"),
    );
    return handleBffRouteError(error, "Erasure request failed");
  }
}
