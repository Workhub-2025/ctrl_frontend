import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { requireFirebaseSupportSession } from "@/lib/firebase-support-bff";

export async function GET(request: NextRequest) {
  try {
    const { support } = await requireFirebaseSupportSession("admin");
    const { searchParams } = new URL(request.url);
    const tickets = await support.listAll({
      status: searchParams.get("status") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });
    return NextResponse.json({ data: tickets });
  } catch (error) {
    return handleBffRouteError(error, "Tickets could not be loaded");
  }
}

export async function POST(request: NextRequest) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const { support } = await requireFirebaseSupportSession(
      "candidate",
      "hiring_manager",
      "client",
      "admin",
    );
    const body = await request.json();
    const ticket = await support.createTicket({
      subject: String(body?.subject ?? ""),
      description: String(body?.description ?? ""),
      category: String(body?.category ?? "general"),
      priority: String(body?.priority ?? "normal"),
      metadata:
        body?.metadata && typeof body.metadata === "object"
          ? body.metadata
          : undefined,
    });
    return NextResponse.json({ data: ticket }, { status: 201 });
  } catch (error) {
    return handleBffRouteError(error, "Ticket could not be created");
  }
}
