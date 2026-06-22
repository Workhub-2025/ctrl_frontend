import { NextRequest, NextResponse } from "next/server";
import { getStrapiClient } from "@/lib/strapi";
import { requireCandidateSession, handleBffRouteError } from "@/lib/auth/bff-session";
import {
  PORTAL_CANDIDATE_WORKSPACE_TTL_MS,
  portalCandidateWorkspaceCacheKey,
} from "@/lib/portal-cache-keys";
import { getServerAuthSub } from "@/lib/portal-server-auth";
import { portalServerCacheGetOrSet } from "@/lib/portal-server-cache";

async function fetchCandidateWorkspace(client: ReturnType<typeof getStrapiClient>, query: string) {
  return client.fetch(`/candidate/workspace${query ? `?${query}` : ""}`, { method: "GET" });
}

export async function GET(request: NextRequest) {
  try {
    const { strapiJwt } = await requireCandidateSession();
    const client = getStrapiClient(strapiJwt);
    const query = request.nextUrl.searchParams.toString();
    const userSub = await getServerAuthSub();

    const loadWorkspace = async () => {
      const response = await fetchCandidateWorkspace(client, query);
      const payload = await response.json();

      if (!response.ok) {
        throw Object.assign(
          new Error(payload?.error?.message ?? "Candidate workspace could not be loaded"),
          { status: response.status },
        );
      }

      return payload.data ?? [];
    };

    const data =
      userSub != null
        ? await portalServerCacheGetOrSet(
            portalCandidateWorkspaceCacheKey(userSub),
            PORTAL_CANDIDATE_WORKSPACE_TTL_MS,
            loadWorkspace,
          )
        : await loadWorkspace();

    return NextResponse.json({ data });
  } catch (error) {
    const status =
      error instanceof Error && "status" in error && typeof error.status === "number"
        ? error.status
        : undefined;

    if (status != null) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Candidate workspace could not be loaded" },
        { status },
      );
    }

    return handleBffRouteError(error, "Candidate workspace could not be loaded");
  }
}
