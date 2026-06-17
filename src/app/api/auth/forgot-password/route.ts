import { NextResponse } from "next/server";
import { postStrapiAuth } from "@/lib/auth/strapi-public-auth";
import { logAuthAuditEvent } from "@/lib/security/audit-log";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginRequest(request);
  if (forbidden) {
    return forbidden;
  }

  const ipAddress = extractClientIp(request);
  const rateLimit = await applyRateLimit({
    key: `auth:forgot-password:${ipAddress}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many reset requests. Please try again later." },
      {
        status: 429,
        headers: rateLimit.retryAfterSeconds
          ? { "Retry-After": String(rateLimit.retryAfterSeconds) }
          : undefined,
      }
    );
  }

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();

  if (!email || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
  }

  await postStrapiAuth("auth/forgot-password", { email });

  logAuthAuditEvent("password_reset_request", { email, ipAddress });

  // Always succeed — do not reveal whether the account exists.
  return NextResponse.json({ ok: true });
}
