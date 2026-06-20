import { NextRequest, NextResponse } from "next/server";
import { getStrapiClient } from "@/lib/strapi";
import {
  handleBffRouteError,
  requireCandidateSession,
} from "@/lib/auth/bff-session";

/** Join a candidate application via access code. List applications via GET /api/candidate/workspace. */
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
