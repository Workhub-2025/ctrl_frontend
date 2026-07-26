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
    const messages = await support.listMessages(id);
    return NextResponse.json({ data: messages });
  } catch (error) {
    return handleBffRouteError(error, "Messages could not be loaded");
  }
}

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
    const message = await support.addMessage(id, {
      body: String(body?.body ?? ""),
      isInternal: Boolean(body?.isInternal),
    });
    return NextResponse.json({ data: message }, { status: 201 });
  } catch (error) {
    return handleBffRouteError(error, "Message could not be sent");
  }
}
