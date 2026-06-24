import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { generateOfflineCodesForSession } from "@/services/hiring-manager-campaigns.service";

import { requireHmSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    await requireHmSession();

    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const session = await getServerSession(authOptions);
    const limiter = await applyRateLimit({
      key: `hm-session-offline-codes:${session?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
      limit: 8,
      windowMs: 60_000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please retry shortly." },
        { status: 429, headers: { "retry-after": String(limiter.retryAfterSeconds) } }
      );
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    try {
      const { sessionId } = await context.params;
      const body = await request.json().catch(() => ({}));
      const count = Number(body?.count);

      if (!Number.isInteger(count) || count < 1 || count > 100) {
        return NextResponse.json({ error: "Count must be an integer between 1 and 100" }, { status: 400 });
      }

      const result = await generateOfflineCodesForSession(sessionId, count);
      return NextResponse.json({ data: result }, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Offline codes could not be generated",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    return handleBffRouteError(error, "Offline codes could not be generated");
  }
}
