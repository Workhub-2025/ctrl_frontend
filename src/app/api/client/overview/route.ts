import { NextResponse } from "next/server";

import { GET as getClientDashboard } from "@/app/api/client/dashboard/route";

/** Thin alias — overview and dashboard share the same screen aggregate. */
export async function GET(request: Request) {
  return getClientDashboard(request);
}
