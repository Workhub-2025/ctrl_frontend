import { NextResponse } from "next/server";
import {
  createClientUpgradeRequest,
  listClientUpgradeRequests,
} from "@/services/client-upgrade.service";
import type { ClientUpgradeRequestPayload } from "@/lib/client/entitlements";
import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

export async function GET() {
  try {
    await requireClientSession();
    const data = await listClientUpgradeRequests();
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Upgrade requests could not be loaded");
  }
}

export async function POST(request: Request) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

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
    if (
      message.includes("must be") ||
      message.includes("Please provide") ||
      message.includes("payload")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return handleBffRouteError(error, "Upgrade request could not be submitted");
  }
}
