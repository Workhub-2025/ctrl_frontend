import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import {
  createHiringManagerCampaign,
  getStrapiErrorStatus,
  getHiringManagerCampaigns,
  type HiringManagerCampaignCreateInput,
} from "@/services/hiring-manager-campaigns.service";

function validateCreatePayload(
  body: unknown
): { valid: true; data: HiringManagerCampaignCreateInput } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be an object" };
  }

  const data = body as Partial<HiringManagerCampaignCreateInput>;
  if (!data.name?.trim()) return { valid: false, error: "Campaign name is required" };
  if (!data.jobRole?.trim()) return { valid: false, error: "Role title is required" };
  if (!data.startDate) return { valid: false, error: "Start date is required" };
  if (!["in_person", "remote", "hybrid"].includes(data.assessmentMode ?? "")) {
    return { valid: false, error: "Delivery mode is invalid" };
  }
  if (
    typeof data.vacancyCount !== "number" ||
    !Number.isInteger(data.vacancyCount) ||
    data.vacancyCount < 1
  ) {
    return { valid: false, error: "Expected candidates must be at least 1" };
  }
  if (!Array.isArray(data.assessmentDocumentIds) || data.assessmentDocumentIds.length === 0) {
    return { valid: false, error: "Select at least one assessment" };
  }
  if (
    data.assessmentSettings !== undefined &&
    (typeof data.assessmentSettings !== "object" || data.assessmentSettings === null)
  ) {
    return { valid: false, error: "Assessment settings must be an object" };
  }
  const assessmentSettings = data.assessmentSettings as
    | { weights?: Record<string, unknown> }
    | undefined;
  const weights = assessmentSettings?.weights;
  if (!weights || typeof weights !== "object" || Array.isArray(weights)) {
    return { valid: false, error: "Assessment weights are required" };
  }
  const weightValues = Object.values(weights);
  if (weightValues.length !== data.assessmentDocumentIds.length) {
    return {
      valid: false,
      error: "Each selected assessment must have a weighting",
    };
  }
  const weightTotal = weightValues.reduce<number>((total, value) => {
    const numericValue = typeof value === "number" ? value : Number(value);
    return total + (Number.isFinite(numericValue) ? numericValue : Number.NaN);
  }, 0);
  if (!Number.isFinite(weightTotal) || weightTotal !== 100) {
    return {
      valid: false,
      error:
        "Assessment weights must equal 100% overall. Update the weights before creating the campaign.",
    };
  }

  return { valid: true, data: data as HiringManagerCampaignCreateInput };
}

async function enforceRateLimit(request: NextRequest, action: "get" | "post") {
  const session = await getServerSession(authOptions);
  const keyUser = session?.user?.id ?? "anonymous";
  const limiter = await applyRateLimit({
    key: `hm-campaigns:${action}:${keyUser}:${extractClientIp(request)}`,
    limit: action === "get" ? 30 : 8,
    windowMs: 60_000,
  });

  if (limiter.allowed) return null;

  return NextResponse.json(
    { error: "Too many requests. Please retry shortly." },
    {
      status: 429,
      headers: {
        "retry-after": String(limiter.retryAfterSeconds),
      },
    }
  );
}

import { requireHmSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
export async function GET(request: NextRequest) {
  try {
    await requireHmSession();

    const limited = await enforceRateLimit(request, "get");
    if (limited) return limited;

    const result = await getHiringManagerCampaigns();

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ data: result.campaigns });
  } catch (error) {
    return handleBffRouteError(error, "Campaigns could not be loaded");
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireHmSession();

  const crossOriginResponse = rejectMutatingCrossOrigin(request);
  if (crossOriginResponse) return crossOriginResponse;

    const limited = await enforceRateLimit(request, "post");
    if (limited) return limited;

    const body = await request.json();
    const validation = validateCreatePayload(body);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const result = await createHiringManagerCampaign(validation.data);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    const upstreamStatus = getStrapiErrorStatus(error);
    const message =
      error instanceof Error ? error.message : "Campaign could not be created";

    console.error("[POST /api/hiring-manager/campaigns] Failed", {
      upstreamStatus,
      message,
    });

    return NextResponse.json(
      {
        error: message,
      },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 }
    );
  }
}
