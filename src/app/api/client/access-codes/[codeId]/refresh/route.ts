import { NextResponse } from "next/server";
import { refreshHiringManagerAccessCode } from "@/services/client-portal.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

function parseSeatNumber(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value !== "string") return undefined;
  const numeric = Number(value.match(/\d+/)?.[0] ?? value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : undefined;
}

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

    const body = await request.json().catch(() => ({}));
    const seatNumber = parseSeatNumber(body?.seatNumber ?? body?.seatLabel);
    const seatLabel = typeof body?.seatLabel === "string" ? body.seatLabel : undefined;
    const code = await refreshHiringManagerAccessCode(codeId, { seatNumber, seatLabel });
    return NextResponse.json({ data: code }, { status: 201 });
  } catch (error) {
    return handleBffRouteError(error, "Access code could not be refreshed");
  }
}
