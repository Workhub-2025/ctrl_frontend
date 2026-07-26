import { NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { requireFirebaseSupportSession } from "@/lib/firebase-support-bff";

export async function GET() {
  try {
    const { support } = await requireFirebaseSupportSession("admin");
    const stats = await support.getStats();
    return NextResponse.json({ data: stats });
  } catch (error) {
    return handleBffRouteError(error, "Ticket stats could not be loaded");
  }
}
