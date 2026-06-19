import { NextResponse } from "next/server";
import {
  generateHiringManagerAccessCode,
  getClientAccessCodes,
  refreshHiringManagerAccessCode,
} from "@/services/client-portal.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

function parseSeatNumber(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value !== "string") return undefined;
  const numeric = Number(value.match(/\d+/)?.[0] ?? value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : undefined;
}

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
    const seatNumber = parseSeatNumber(body?.seatNumber ?? body?.seatLabel);
    const seatLabel = typeof body?.seatLabel === "string" ? body.seatLabel : undefined;
    const code = body?.refreshCodeDocumentId
      ? await refreshHiringManagerAccessCode(String(body.refreshCodeDocumentId), {
          seatNumber,
          seatLabel,
        })
      : await generateHiringManagerAccessCode({
          seatNumber,
          seatLabel,
        });

    return NextResponse.json({ data: code }, { status: 201 });
  } catch (error) {
    return handleBffRouteError(error, "Access codes could not be loaded");
  
  }
}
