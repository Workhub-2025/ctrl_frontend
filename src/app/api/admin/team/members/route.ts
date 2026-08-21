import { NextResponse } from "next/server";

import { requireAdminDualAccess } from "@/lib/auth/admin-dual-access";
import { mapFirebaseRolesToPlatformRoles } from "@/lib/firebase-admin-tenancy-bff";

export async function POST(request: Request) {
  const auth = await requireAdminDualAccess("admins.manage");
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const firstName =
    typeof (body as { firstName?: unknown }).firstName === "string"
      ? (body as { firstName: string }).firstName.trim()
      : "";
  const lastName =
    typeof (body as { lastName?: unknown }).lastName === "string"
      ? (body as { lastName: string }).lastName.trim()
      : "";
  const email =
    typeof (body as { email?: unknown }).email === "string"
      ? (body as { email: string }).email.trim().toLowerCase()
      : "";
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || email;
  const roles = mapFirebaseRolesToPlatformRoles({
    isSuperAdmin: Boolean((body as { isSuperAdmin?: unknown }).isSuperAdmin),
    roleTypes: Array.isArray((body as { roleTypes?: unknown }).roleTypes)
      ? ((body as { roleTypes: string[] }).roleTypes)
      : [],
  });
  if (roles.length === 0) {
    return NextResponse.json(
      { error: "Select at least one role or enable full super admin access." },
      { status: 400 },
    );
  }

  const result = await auth.domainApi.request<{
    invitationId: string;
    email: string;
    roles: string[];
    alreadyRegistered: boolean;
    deliveryQueued: boolean;
    alreadyQueued: boolean;
  }>({
    path: "/v1/platform-administrators",
    method: "POST",
    firebaseSessionCookie: auth.firebaseSessionCookie,
    body: {
      email,
      displayName,
      roles,
    },
  });

  return NextResponse.json(
    {
      data: {
        email: result.email,
        invitationId: result.invitationId,
        roles: result.roles,
        deliveryQueued: result.deliveryQueued,
        alreadyQueued: result.alreadyQueued,
      },
    },
    { status: result.alreadyRegistered ? 200 : 201 },
  );
}
