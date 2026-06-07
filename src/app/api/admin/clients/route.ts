import { NextResponse } from "next/server";
import { getAdminClients } from "@/services/admin-platform.service";

export async function GET() {
  try {
    const clients = await getAdminClients();
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
