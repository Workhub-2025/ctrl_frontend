import { NextResponse } from "next/server";
import { getServerStrapiClient } from "@/lib/strapi";
import { requireCandidateSession, handleBffRouteError } from "@/lib/auth/bff-session";

export async function GET() {
  try {
    await requireCandidateSession();

    const client = await getServerStrapiClient();
    const response = await client.fetch("/candidate/workspace");
    const payload = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: payload?.error?.message ?? "Candidate workspace could not be loaded" },
        { status: response.status }
      );
    }

    return NextResponse.json({ data: payload.data ?? [] });
  } catch (error) {
    return handleBffRouteError(error, "Candidate workspace could not be loaded");
  }
}
