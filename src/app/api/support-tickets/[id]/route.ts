import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { requireFirebaseSupportSession } from "@/lib/firebase-support-bff";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { support } = await requireFirebaseSupportSession(
      "candidate",
      "hiring_manager",
      "client",
      "admin",
    );
    const ticket = await support.getTicket(id);
    return NextResponse.json({ data: ticket });
  } catch (error) {
    return handleBffRouteError(error, "Ticket could not be loaded");
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const { id } = await context.params;
    const { support } = await requireFirebaseSupportSession("admin");
    const body = await request.json();
    const ticket = await support.updateTicket(id, {
      status: body?.status,
      assignedTo: body?.assignedTo,
      resolution: body?.resolution,
      priority: body?.priority,
    });
    return NextResponse.json({ data: ticket });
  } catch (error) {
    return handleBffRouteError(error, "Ticket could not be updated");
  }
}
