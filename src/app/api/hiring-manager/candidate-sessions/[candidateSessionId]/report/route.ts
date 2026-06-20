import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerStrapiClient } from "@/lib/strapi";
import { requireHmSession, handleBffRouteError } from "@/lib/auth/bff-session";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ candidateSessionId: string }> }
) {
  try {
    await requireHmSession();
    const { candidateSessionId } = await context.params;

    const client = await getServerStrapiClient();
    const response = await client.fetch(
      `/hiring-manager/candidate-sessions/${candidateSessionId}/report`
    );
    const payload = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: payload?.error?.message ?? "Candidate report could not be loaded" },
        { status: response.status }
      );
    }

    return NextResponse.json({ data: payload.data ?? null });
  } catch (error) {
    return handleBffRouteError(error, "Candidate report could not be loaded");
  }
}
