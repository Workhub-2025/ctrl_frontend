import { NextRequest, NextResponse } from "next/server";
import { getStrapiClient } from "@/lib/strapi";
import {
  handleBffRouteError,
  requireCandidateSession,
} from "@/lib/auth/bff-session";

export async function GET(request: NextRequest) {
  try {
    const { strapiJwt } = await requireCandidateSession();
    const client = getStrapiClient(strapiJwt);
    const query = request.nextUrl.searchParams.toString();
    const path = `/candidate-sessions/me${query ? `?${query}` : ""}`;

    const response = await client.fetch(path, { method: "GET" });
    const body = await response.json().catch(() => ({}));

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    return handleBffRouteError(error, "Applications could not be loaded");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { strapiJwt } = await requireCandidateSession();
    const payload = (await request.json()) as { accessCode?: string };

    if (!payload?.accessCode || typeof payload.accessCode !== "string") {
      return NextResponse.json({ error: "accessCode is required" }, { status: 400 });
    }

    const client = getStrapiClient(strapiJwt);
    const response = await client.fetch("/candidate-sessions/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessCode: payload.accessCode.trim() }),
    });
    const body = await response.json().catch(() => ({}));

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    return handleBffRouteError(error, "Could not link access code");
  }
}
