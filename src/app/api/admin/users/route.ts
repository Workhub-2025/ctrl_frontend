import { NextResponse } from "next/server";

import { requireAdminDualAccess } from "@/lib/auth/admin-dual-access";
import {
  toAdminUsersSummary,
  type FirebaseDirectoryUser,
} from "@/lib/firebase-admin-tenancy-bff";

export async function GET() {
  try {
    const auth = await requireAdminDualAccess("users.read");
    if ("error" in auth) return auth.error;

    const users = await auth.domainApi.request<FirebaseDirectoryUser[]>({
      path: "/v1/directory/users",
      firebaseSessionCookie: auth.firebaseSessionCookie,
    });
    return NextResponse.json({ data: toAdminUsersSummary(users) });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Users could not be loaded",
      },
      { status: 500 },
    );
  }
}
