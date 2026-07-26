import { NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { requireFirebaseSupportSession } from "@/lib/firebase-support-bff";

export async function GET() {
  try {
    const { support } = await requireFirebaseSupportSession(
      "candidate",
      "hiring_manager",
      "client",
      "admin",
    );
    const tickets = await support.listMine();
    return NextResponse.json({ data: tickets });
  } catch (error) {
    return handleBffRouteError(error, "Tickets could not be loaded");
  }
}
