import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import {
  recruitmentIdempotencyKey,
} from "@/lib/firebase-recruitment-api";
import {
  requireFirebaseRecruitmentSession,
  toHiringManagerCampaign,
} from "@/lib/firebase-recruitment-bff";
import {
  readAssessmentSettingVersion,
  resolveCatalogueReleaseId,
} from "@/lib/hiring-manager/resolve-assessment-release";

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

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

type HiringManagerCampaignCreateInput = {
  name: string;
  jobRole: string;
  campaignType?: string;
  startDate: string;
  endDate?: string | null;
  isOngoing?: boolean;
  vacancyCount: number;
  location?: string;
  assessmentMode: "in_person" | "remote" | "hybrid";
  bypassEmailConfirmation?: boolean;
  assessmentDocumentIds: string[];
  assessmentSettings?: Record<string, unknown>;
};
export async function GET(request: NextRequest) {
  try {
    const { context, recruitment } =
      await requireFirebaseRecruitmentSession("hiring_manager");
    if (!context.organizationId) {
      return NextResponse.json({ error: "Organization membership is required" }, { status: 403 });
    }

    const limited = await enforceRateLimit(request, "get");
    if (limited) return limited;

    const result = await recruitment.listCampaigns(context.organizationId);
    return NextResponse.json({
      data: result.items.map((campaign) => toHiringManagerCampaign(campaign)),
    });
  } catch (error) {
    return handleBffRouteError(error, "Campaigns could not be loaded");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, recruitment } =
      await requireFirebaseRecruitmentSession("hiring_manager");
    if (!context.organizationId || !context.seatId) {
      return NextResponse.json(
        { error: "An active organization seat is required" },
        { status: 403 },
      );
    }

  const crossOriginResponse = rejectMutatingCrossOrigin(request);
  if (crossOriginResponse) return crossOriginResponse;

    const limited = await enforceRateLimit(request, "post");
    if (limited) return limited;

    const body = await request.json();
    const validation = validateCreatePayload(body);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const payload = validation.data;
    const operationKey = recruitmentIdempotencyKey(
      "campaign:create",
      context.userId,
      payload,
    );
    const result = await recruitment.createCampaign({
      organizationId: context.organizationId,
      ownerSeatId: context.seatId,
      title: payload.name.trim(),
      description: "",
      jobRole: payload.jobRole.trim(),
      campaignType: payload.campaignType || "standard",
      assessmentMode: payload.assessmentMode,
      startDate: new Date(payload.startDate).toISOString(),
      endDate:
        payload.isOngoing || !payload.endDate
          ? null
          : new Date(payload.endDate).toISOString(),
      isOngoing: Boolean(payload.isOngoing),
      vacancyCount: payload.vacancyCount,
      location: payload.location?.trim() || null,
      idempotencyKey: operationKey,
    });

    const catalogue = await recruitment.listAssessmentCatalogue();
    const assessments = payload.assessmentDocumentIds.map((selectedId) => {
      const item = catalogue.find(
        (candidate) =>
          candidate.releaseId === selectedId ||
          candidate.definitionId === selectedId ||
          candidate.slug === selectedId,
      );
      if (!item) {
        throw new Error(`Assessment "${selectedId}" is not an active Firebase release`);
      }
      const selectedVersion = readAssessmentSettingVersion(
        payload.assessmentSettings as Record<string, unknown> | undefined,
        item.slug,
      );
      const releaseId = resolveCatalogueReleaseId({
        slug: item.slug,
        selectedVersion,
        fallbackReleaseId: item.releaseId,
        availableReleases: item.availableReleases ?? [
          {
            releaseId: item.releaseId,
            releaseVersion: item.releaseVersion ?? "0.0.0",
            status: "active",
          },
        ],
      });
      return {
        definitionId: item.definitionId,
        releaseId,
        durationMinutes: null,
        maxAttempts: 1,
      };
    });
    await recruitment.replaceAssessmentStack(result.campaignId, {
      expectedVersion: 0,
      assessments,
      idempotencyKey: recruitmentIdempotencyKey(
        "campaign:assessment-stack",
        context.userId,
        { campaignId: result.campaignId, assessments },
      ),
    });
    const workspace = await recruitment.getCampaign(result.campaignId);
    return NextResponse.json(
      { data: { campaign: toHiringManagerCampaign(workspace.campaign, workspace) } },
      { status: result.alreadyCreated ? 200 : 201 },
    );
  } catch (error) {
    return handleBffRouteError(error, "Campaign could not be created");
  }
}
