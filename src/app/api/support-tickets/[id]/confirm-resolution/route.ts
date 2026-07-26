import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { requireFirebaseSupportSession } from "@/lib/firebase-support-bff";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const { id } = await context.params;
    const { support } = await requireFirebaseSupportSession(
      "candidate",
      "hiring_manager",
      "client",
      "admin",
    );
    const body = await request.json();
    const action = body?.action === "reopen" ? "reopen" : "confirm";
    const ticket = await support.confirmResolution(id, {
      action,
      body: typeof body?.body === "string" ? body.body : undefined,
    });
    return NextResponse.json({ data: ticket });
  } catch (error) {
    return handleBffRouteError(error, "Resolution confirmation failed");
  }
}
