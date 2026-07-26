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
    const { support } = await requireFirebaseSupportSession("admin");
    const body = await request.json();
    const target = body?.target === "billing" ? "billing" : "ops";
    const ticket = await support.escalate(id, {
      target,
      note: typeof body?.note === "string" ? body.note : undefined,
    });
    return NextResponse.json({ data: ticket });
  } catch (error) {
    return handleBffRouteError(error, "Ticket could not be escalated");
  }
}
