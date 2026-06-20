import { NextResponse } from "next/server";
import { postStrapiAuth } from "@/lib/auth/strapi-public-auth";
import { logAuthAuditEvent } from "@/lib/security/audit-log";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";
import { checkStrapiReachability } from "@/lib/strapi-connectivity";

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginRequest(request);
  if (forbidden) {
    return forbidden;
  }

  const ipAddress = extractClientIp(request);
  const rateLimit = await applyRateLimit({
    key: `auth:reset-password:${ipAddress}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many reset attempts. Please try again later." },
      {
        status: 429,
        headers: rateLimit.retryAfterSeconds
          ? { "Retry-After": String(rateLimit.retryAfterSeconds) }
          : undefined,
      }
    );
  }

  const body = await request.json().catch(() => null);
  const code = String(body?.code ?? "").trim();
  const password = String(body?.password ?? "");
  const passwordConfirmation = String(body?.passwordConfirmation ?? "");

  if (!code) {
    return NextResponse.json({ error: "Reset code is required" }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }
  if (password !== passwordConfirmation) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }

  const strapiIssue = await checkStrapiReachability();
  if (strapiIssue) {
    return NextResponse.json({ error: strapiIssue.message }, { status: 503 });
  }

  const result = await postStrapiAuth("auth/reset-password", {
    code,
    password,
    passwordConfirmation,
  });

  if (!result.ok) {
    logAuthAuditEvent("password_reset_failure", { ipAddress, reason: result.error });
    return NextResponse.json(
      { error: result.error ?? "Password could not be reset" },
      { status: result.status >= 400 ? result.status : 400 }
    );
  }

  logAuthAuditEvent("password_reset_success", { ipAddress });

  return NextResponse.json({ ok: true, data: result.data ?? null });
}
