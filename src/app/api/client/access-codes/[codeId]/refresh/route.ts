import { NextResponse } from "next/server";
import { refreshHiringManagerAccessCode } from "@/services/client-portal.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

export async function POST(
  request: Request,
  context: { params: Promise<{ codeId: string }> }
) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    await requireClientSession();

    const { codeId } = await context.params;
    if (!codeId) {
      return NextResponse.json({ error: "Access code is required" }, { status: 400 });
    }

    const code = await refreshHiringManagerAccessCode(codeId);
    return NextResponse.json({ data: code }, { status: 201 });
  } catch (error) {
    return handleBffRouteError(error, "Access code could not be refreshed");
  }
}
