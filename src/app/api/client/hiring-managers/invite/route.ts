import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import {
  defaultInvitationExpiry,
  requireFirebaseTenancySession,
} from "@/lib/firebase-tenancy-bff";
import { invitationAcceptUrl } from "@/lib/public-app-urls";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { rejectRateLimitedMutation } from "@/lib/security/api-rate-limit";

function parseSeatNumber(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value !== "string") return undefined;
  const numeric = Number(value.match(/\d+/)?.[0] ?? value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : undefined;
}

export async function POST(request: NextRequest) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const { session, context, tenancy } =
      await requireFirebaseTenancySession("client");
    if (!context.organizationId) {
      return NextResponse.json(
        { error: "Organization membership is required" },
        { status: 403 },
      );
    }

    const rateLimited = await rejectRateLimitedMutation(request, {
      scope: "client:hm-invite",
      actorId: session.user.id,
      limit: 10,
    });
    if (rateLimited) return rateLimited;

    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const seatNumber = parseSeatNumber(body?.seatNumber ?? body?.seatLabel);
    const accessCodeDocumentId =
      typeof body?.accessCodeDocumentId === "string"
        ? body.accessCodeDocumentId
        : undefined;

    if (!email) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 },
      );
    }

    const workspace = await tenancy.getClientTeamWorkspace(context.organizationId);
    const seatFromAccessCode = accessCodeDocumentId
      ? workspace.seats.find(
          (item) =>
            item.id === accessCodeDocumentId ||
            item.pendingInvitationId === accessCodeDocumentId,
        )
      : undefined;
    const seat =
      seatFromAccessCode ??
      (seatNumber
        ? workspace.seats.find((item) => item.seatNumber === seatNumber)
        : undefined) ??
      workspace.seats.find((item) => item.status === "available");

    if (!seat) {
      return NextResponse.json(
        { error: "No available hiring-manager seat for this invitation" },
        { status: 409 },
      );
    }

    const expiresAt = defaultInvitationExpiry();
    const result =
      seat.status === "available"
        ? await tenancy.createInvitation({
            organizationId: context.organizationId,
            email,
            role: "hiring_manager",
            seatId: seat.id,
            expiresAt,
          })
        : await tenancy.replaceSeatOccupant(context.organizationId, seat.id, {
            email,
            expiresAt,
          });

    const acceptUrl = invitationAcceptUrl(request, result.token, email);

    return NextResponse.json(
      {
        data: {
          documentId: result.invitationId,
          invitedEmail: email,
          seatNumber: seat.seatNumber,
          seatLabel: seat.seatLabel ?? `Seat ${seat.seatNumber}`,
          status: "reserved",
          targetRole: "hiring_manager",
          expiresAt,
          inviteAcceptUrl: acceptUrl,
          /** @deprecated Prefer inviteAcceptUrl — kept for older UI copies */
          inviteUrl: acceptUrl,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleBffRouteError(error, "Hiring-manager invite could not be sent");
  }
}
