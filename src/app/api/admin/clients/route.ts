import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { isAdminRole } from "@/lib/auth/role-model";
import { getAdminClients } from "@/services/admin-platform.service";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
    }

    const strapiJwt = await getServerStrapiJwt();
    if (!strapiJwt) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const clients = await getAdminClients(strapiJwt);
    return NextResponse.json({ data: clients });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Clients could not be loaded",
      },
      { status: 500 }
    );
  }
}
