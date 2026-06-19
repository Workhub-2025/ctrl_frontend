import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Admin recovery has been retired. Abandoned attempts are audit-only." },
    { status: 410 }
  );
}
