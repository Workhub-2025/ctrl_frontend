import { NextResponse } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import {
  toAdminUsersSummary,
  type FirebaseDirectoryUser,
} from "@/lib/firebase-admin-tenancy-bff";
import { getAdminUsers } from "@/services/admin-platform.service";

export async function GET() {
  try {
    const auth = await requireAdminDualAccess("users.read");
    if ("error" in auth) return auth.error;

    if (isFirebaseAdminAuth(auth)) {
      const users = await auth.domainApi.request<FirebaseDirectoryUser[]>({
        path: "/v1/directory/users",
        firebaseSessionCookie: auth.firebaseSessionCookie,
      });
      return NextResponse.json({ data: toAdminUsersSummary(users) });
    }

    const users = await getAdminUsers(auth.cmsJwt);
    return NextResponse.json({ data: users });
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
