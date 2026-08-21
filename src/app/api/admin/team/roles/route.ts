import { NextResponse } from "next/server";

import { requireAdminDualAccess } from "@/lib/auth/admin-dual-access";
import {
  ADMIN_ASSIGNABLE_GROUP_LABELS,
  type AdminAssignableGroup,
} from "@/lib/auth/admin-portal-permissions";

export async function GET() {
  const auth = await requireAdminDualAccess("admins.manage");
  if ("error" in auth) return auth.error;

  const data = (
    Object.keys(ADMIN_ASSIGNABLE_GROUP_LABELS) as AdminAssignableGroup[]
  ).map((type) => ({
    type,
    label: ADMIN_ASSIGNABLE_GROUP_LABELS[type],
  }));
  return NextResponse.json({ data });
}
