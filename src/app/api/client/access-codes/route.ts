import { NextResponse } from "next/server";
import {
  generateHiringManagerAccessCode,
  getClientAccessCodes,
  refreshHiringManagerAccessCode,
} from "@/services/client-portal.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
export async function GET() {
  try {
    await requireClientSession();

    const codes = await getClientAccessCodes();
    return NextResponse.json({ data: codes });
  } catch (error) {
    return handleBffRouteError(error, "Access codes could not be loaded");
  
  }
}

export async function POST(request: Request) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    await requireClientSession();

    const body = await request.json().catch(() => ({}));
    const code = body?.refreshCodeDocumentId
      ? await refreshHiringManagerAccessCode(String(body.refreshCodeDocumentId))
      : await generateHiringManagerAccessCode();

    return NextResponse.json({ data: code }, { status: 201 });
  } catch (error) {
    return handleBffRouteError(error, "Access codes could not be loaded");
  
  }
}
