import type { NextRequest } from "next/server";
import { forwardPortalTotpRequest } from "@/lib/auth/admin-totp-bff";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return forwardPortalTotpRequest(
    request,
    "/auth/totp/disable",
    "POST",
    body,
  );
}
