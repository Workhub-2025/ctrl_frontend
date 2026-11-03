import { NextResponse } from "next/server";

import { createDomainApi } from "@/lib/domain-api";
import { parseInvitationEmail } from "@/lib/firebase-provisioning-contracts";
import {
  accountProvisioningRateLimit,
  rejectRateLimitedMutation,
} from "@/lib/security/api-rate-limit";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";

const MAX_BODY_BYTES = 2_000;

/**
 * Starts a CTRL password reset. domainApi emails a CTRL-branded link to
 * /auth/reset-password. The answer is the same whether or not the email has
 * an account, so this cannot be used to discover accounts.
 */
export async function POST(request: Request) {
  const forbidden = rejectCrossOriginRequest(request);
  if (forbidden) return forbidden;
  const limit = accountProvisioningRateLimit();
  const rateLimited = await rejectRateLimitedMutation(request, {
    scope: "password-reset-request",
    limit: limit.limit,
    windowMs: limit.windowMs,
  });
  if (rateLimited) return rateLimited;

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Payload too large" },
      { status: 413, headers: { "cache-control": "no-store" } },
    );
  }
  let body: Record<string, unknown> | null = null;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    body = null;
  }
  const email = parseInvitationEmail(body?.email);
  if (!email) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    await createDomainApi().requestPasswordReset({ email });
  } catch (error) {
    console.error("[password-reset] request failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
  }
  return NextResponse.json(
    { data: { ok: true } },
    { headers: { "cache-control": "no-store" } },
  );
}
