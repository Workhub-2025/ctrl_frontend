import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import {
  getClientDashboardSummary,
  inviteHiringManagerByEmail,
} from "@/services/client-portal.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

function parseSeatNumber(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value !== "string") return undefined;
  const numeric = Number(value.match(/\d+/)?.[0] ?? value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : undefined;
}

export async function POST(request: NextRequest) {
  try {
    await requireClientSession();

    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const originRejected = rejectCrossOriginRequest(request);
    if (originRejected) {
      return originRejected;
    }

    const session = await getServerSession(authOptions);
    const limiter = await applyRateLimit({
      key: `client-hm-invite:${session?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
      limit: 10,
      windowMs: 60_000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please retry shortly." },
        { status: 429, headers: { "retry-after": String(limiter.retryAfterSeconds) } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const seatNumber = parseSeatNumber(body?.seatNumber ?? body?.seatLabel);
    const seatLabel = typeof body?.seatLabel === "string" ? body.seatLabel : undefined;

    if (!email) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    const summary = await getClientDashboardSummary();
    const clientDocumentId = summary?.client?.documentId;

    if (!clientDocumentId) {
      return NextResponse.json(
        { error: "Client account could not be resolved" },
        { status: 403 }
      );
    }

    const result = await inviteHiringManagerByEmail({
      clientDocumentId,
      email,
      accessCodeDocumentId:
        typeof body?.accessCodeDocumentId === "string"
          ? body.accessCodeDocumentId
          : undefined,
      seatNumber,
      seatLabel,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleBffRouteError(error, "Hiring-manager invite could not be sent");
  }
}
