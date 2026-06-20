import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireHmSession, handleBffRouteError } from "@/lib/auth/bff-session";
import {
  getHiringManagerCandidateReport,
} from "@/services/hiring-manager-campaigns.service";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ candidateSessionId: string }> }
) {
  try {
    await requireHmSession();
    const { candidateSessionId } = await context.params;

    const result = await getHiringManagerCandidateReport(candidateSessionId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.report });
  } catch (error) {
    return handleBffRouteError(error, "Candidate report could not be loaded");
  }
}
