import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { resolveCorrelationId, startServerActionTrace } from "@/lib/observability/server-observability";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";

export async function GET(request: NextRequest) {
  const correlationId = resolveCorrelationId();
  const trace = startServerActionTrace("user.data-export", { correlationId });

  try {
    const auth = await requireFirebaseSession();
    const limiter = await applyRateLimit({
      key: `user:data-export:${auth.session.user.id}:${extractClientIp(request)}`,
      limit: 5,
      windowMs: 60 * 60_000,
    });
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many export requests. Please try again later." },
        {
          status: 429,
          headers: {
            "x-correlation-id": correlationId,
            "retry-after": String(limiter.retryAfterSeconds),
          },
        },
      );
    }

    const data = await auth.domainApi.request<Record<string, unknown>>({
      path: "/v1/privacy/me/export",
      firebaseSessionCookie: auth.firebaseSessionCookie,
    });

    const manifest =
      data &&
      typeof data === "object" &&
      "manifest" in data &&
      data.manifest &&
      typeof data.manifest === "object"
        ? (data.manifest as { complete?: boolean })
        : null;
    const complete = manifest?.complete === true;
    const filename = complete
      ? `ctrl-data-export-${auth.session.user.id}.json`
      : `ctrl-data-export-partial-${auth.session.user.id}.json`;

    trace.success({ userId: auth.session.user.id });
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "x-ctrl-export-complete": complete ? "true" : "false",
        "x-correlation-id": correlationId,
      },
    });
  } catch (error: unknown) {
    trace.failure(error instanceof Error ? error : new Error("Data export failed"));
    return handleBffRouteError(error, "Data export failed");
  }
}
