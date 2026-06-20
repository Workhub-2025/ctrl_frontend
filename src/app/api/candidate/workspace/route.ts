import { NextRequest, NextResponse } from "next/server";
import { getStrapiClient } from "@/lib/strapi";
import { requireCandidateSession, handleBffRouteError } from "@/lib/auth/bff-session";

async function fetchCandidateWorkspace(client: ReturnType<typeof getStrapiClient>, query: string) {
  return client.fetch(`/candidate/workspace${query ? `?${query}` : ""}`, { method: "GET" });
}

export async function GET(request: NextRequest) {
  try {
    const { strapiJwt } = await requireCandidateSession();
    const client = getStrapiClient(strapiJwt);
    const query = request.nextUrl.searchParams.toString();

    const response = await fetchCandidateWorkspace(client, query);
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
