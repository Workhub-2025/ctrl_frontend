import { NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import {
  requireFirebaseTenancySession,
  toClientHiringManagers,
} from "@/lib/firebase-tenancy-bff";

export async function GET() {
  try {
    const { context, tenancy } = await requireFirebaseTenancySession("client");
    if (!context.organizationId) {
      return NextResponse.json(
        { error: "Organisation membership is required" },
        { status: 403 },
      );
    }
    const workspace = await tenancy.getClientTeamWorkspace(context.organizationId);
    return NextResponse.json({ data: toClientHiringManagers(workspace) });
  } catch (error) {
    return handleBffRouteError(error, "Hiring managers could not be loaded");
  }
}
