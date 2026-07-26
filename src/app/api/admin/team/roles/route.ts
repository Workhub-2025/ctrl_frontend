import { NextResponse } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import {
  ADMIN_ASSIGNABLE_GROUP_LABELS,
  type AdminAssignableGroup,
} from "@/lib/auth/admin-portal-permissions";
import { joinCmsApiPath, getCmsApiBaseUrl } from "@/legacy-cms/server-url";

export async function GET() {
  const auth = await requireAdminDualAccess("admins.manage");
  if ("error" in auth) return auth.error;

  if (isFirebaseAdminAuth(auth)) {
    const data = (
      Object.keys(ADMIN_ASSIGNABLE_GROUP_LABELS) as AdminAssignableGroup[]
    ).map((type) => ({
      type,
      label: ADMIN_ASSIGNABLE_GROUP_LABELS[type],
    }));
    return NextResponse.json({ data });
  }

  const response = await fetch(
    joinCmsApiPath(getCmsApiBaseUrl(), "/admin/team/roles"),
    {
      headers: {
        Authorization: `Bearer ${auth.cmsJwt}`,
      },
      cache: "no-store",
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload as { error?: { message?: string } }).error?.message ??
      (typeof (payload as { error?: unknown }).error === "string"
        ? (payload as { error: string }).error
        : null) ??
      "Roles could not be loaded";
    return NextResponse.json({ error: message }, { status: response.status });
  }

  return NextResponse.json(payload);
}
