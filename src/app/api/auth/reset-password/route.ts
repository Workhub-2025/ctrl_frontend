import { NextResponse } from "next/server";
import { firebaseAuthRouteGoneResponse } from "@/lib/auth/firebase-auth-route-gone";
import { postCmsAuth } from "@/legacy-cms/public-auth";
import { logAuthAuditEvent } from "@/lib/security/audit-log";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";
import {
  PUBLIC_CMS_UNAVAILABLE_MESSAGE,
  checkCmsReachability,
  logCmsConnectivityIssue,
} from "@/legacy-cms/connectivity";
import { getPasswordPolicyIssue } from "@/lib/security/password-policy";

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginRequest(request);
  if (forbidden) {
    return forbidden;
  }

  const firebaseGone = firebaseAuthRouteGoneResponse();
  if (firebaseGone) {
    return firebaseGone;
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
  const passwordIssue = getPasswordPolicyIssue(password);
  if (passwordIssue) {
    return NextResponse.json(
      { error: passwordIssue },
      { status: 400 }
    );
  }
  if (password !== passwordConfirmation) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }

  const strapiIssue = await checkCmsReachability();
  if (strapiIssue) {
    logCmsConnectivityIssue("auth/reset-password", strapiIssue);
    return NextResponse.json({ error: PUBLIC_CMS_UNAVAILABLE_MESSAGE }, { status: 503 });
  }

  const result = await postCmsAuth("auth/reset-password", {
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
