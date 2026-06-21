import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { getAdminUsers } from "@/services/admin-platform.service";

export async function GET() {
  try {
    const auth = await requireAdminApiAccess('users.read');
    if ("error" in auth) {
      return auth.error;
    }
    const strapiJwt = auth.strapiJwt;

    const users = await getAdminUsers(strapiJwt);
    return NextResponse.json({ data: users });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Users could not be loaded",
      },
      { status: 500 }
    );
  }
}
