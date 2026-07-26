import { NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import {
  defaultInvitationExpiry,
  requireFirebaseTenancySession,
} from "@/lib/firebase-tenancy-bff";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

function parseSeatNumber(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value !== "string") return undefined;
  const numeric = Number(value.match(/\d+/)?.[0] ?? value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : undefined;
}

export async function POST(
  request: Request,
  routeContext: { params: Promise<{ codeId: string }> },
) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const { codeId } = await routeContext.params;
    if (!codeId) {
      return NextResponse.json({ error: "Access code is required" }, { status: 400 });
    }

    const { context, tenancy } = await requireFirebaseTenancySession("client");
    if (!context.organizationId) {
      return NextResponse.json(
        { error: "Organization membership is required" },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const seatNumber = parseSeatNumber(body?.seatNumber ?? body?.seatLabel);
    const workspace = await tenancy.getClientTeamWorkspace(context.organizationId);

    const seat =
      workspace.seats.find(
        (item) =>
          item.id === codeId || item.pendingInvitationId === codeId,
      ) ??
      (seatNumber
        ? workspace.seats.find((item) => item.seatNumber === seatNumber)
        : undefined);

    if (!seat) {
      return NextResponse.json({ error: "Access code seat not found" }, { status: 404 });
    }

    if (!email) {
      if (seat.pendingInvitationId) {
        await tenancy.revokeInvitation(seat.pendingInvitationId);
      }
      return NextResponse.json(
        {
          data: {
            documentId: seat.id,
            expiresAt: defaultInvitationExpiry(),
            status: "available",
            targetRole: "hiring_manager",
            invitedEmail: null,
            seatNumber: seat.seatNumber,
            seatLabel: seat.seatLabel ?? `Seat ${seat.seatNumber}`,
          },
        },
        { status: 201 },
      );
    }

    const expiresAt = defaultInvitationExpiry();
    const replaced = await tenancy.replaceSeatOccupant(
      context.organizationId,
      seat.id,
      { email, expiresAt },
    );

    return NextResponse.json(
      {
        data: {
          documentId: replaced.invitationId,
          expiresAt,
          status: "reserved",
          targetRole: "hiring_manager",
          invitedEmail: email,
          seatNumber: seat.seatNumber,
          seatLabel: seat.seatLabel ?? `Seat ${seat.seatNumber}`,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleBffRouteError(error, "Access code could not be refreshed");
  }
}
