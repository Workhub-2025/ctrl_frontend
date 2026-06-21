import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { getAdminClients } from "@/services/admin-platform.service";

export async function GET() {
  try {
    const auth = await requireAdminApiAccess('clients.read');
    if ("error" in auth) {
      return auth.error;
    }
    const strapiJwt = auth.strapiJwt;

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
