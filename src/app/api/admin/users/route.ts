import { NextResponse } from "next/server";
import { getAdminUsers } from "@/services/admin-platform.service";

export async function GET() {
  try {
    const users = await getAdminUsers();
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
