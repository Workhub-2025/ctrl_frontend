import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireHmSession, handleBffRouteError } from "@/lib/auth/bff-session";
import {
  getHiringManagerCandidateReport,
} from "@/services/hiring-manager-campaigns.service";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    await requireHmSession();
    const { sessionId } = await context.params;

    const result = await getHiringManagerCandidateReport(sessionId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.report });
  } catch (error) {
    return handleBffRouteError(error, "Candidate report could not be loaded");
  }
}
