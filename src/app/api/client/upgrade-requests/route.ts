import { NextResponse } from "next/server";
import {
  createClientUpgradeRequest,
  listClientUpgradeRequests,
  requireClientSession,
} from "@/services/client-upgrade.service";
import type { ClientUpgradeRequestPayload } from "@/lib/client/entitlements";

export async function GET() {
  try {
    await requireClientSession();
    const data = await listClientUpgradeRequests();
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upgrade requests could not be loaded";
    const status = message === "Authentication required" ? 401 : message === "Client access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireClientSession();
    const body = (await request.json().catch(() => ({}))) as {
      payload?: ClientUpgradeRequestPayload;
      priority?: "low" | "normal" | "high" | "urgent";
    };

    if (!body.payload?.type) {
      return NextResponse.json({ error: "payload is required" }, { status: 400 });
    }

    const data = await createClientUpgradeRequest({
      payload: body.payload,
      priority: body.priority,
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upgrade request could not be submitted";
    const status =
      message === "Authentication required"
        ? 401
        : message === "Client access required"
          ? 403
          : message.includes("must be") || message.includes("Please provide")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
