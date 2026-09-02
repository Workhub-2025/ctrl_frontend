import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { validateAssessmentStackPayload } from "@/lib/hiring-manager/campaign-assessment-settings";
import { recruitmentIdempotencyKey } from "@/lib/firebase-recruitment-api";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import {
  readAssessmentSettingVersion,
  resolveCatalogueReleaseId,
} from "@/lib/hiring-manager/resolve-assessment-release";
import { isSameAssessment } from "@/lib/hiring-manager/assessment-matching";

/**
 * Weights are validated above as totalling 100%. Resolve each one against the
 * assessment it belongs to so the backend can persist the campaign weighting
 * rather than falling back to an equal split.
 */
function readAssessmentWeight(
  assessmentSettings: Record<string, unknown> | undefined,
  slug: string,
  selectedId: string,
): number | null {
  const weights = assessmentSettings?.weights;
  if (!weights || typeof weights !== "object" || Array.isArray(weights)) {
    return null;
  }
  const entry = Object.entries(weights as Record<string, unknown>).find(
    ([key]) => key === selectedId || key === slug || isSameAssessment(slug, key),
  );
  const value = entry ? Number(entry[1]) : Number.NaN;
  return Number.isFinite(value) ? Math.round(value) : null;
}
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { context: actor, recruitment } =
      await requireFirebaseRecruitmentSession("hiring_manager");

    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const session = await getServerSession(authOptions);
    const limiter = await applyRateLimit({
      key: `hm-campaign-stack:put:${session?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
      limit: 10,
      windowMs: 60_000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please retry shortly." },
        { status: 429, headers: { "retry-after": String(limiter.retryAfterSeconds) } }
      );
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    try {
      const { campaignId } = await context.params;
      const body = await request.json().catch(() => ({}));
      const assessmentDocumentIds: string[] = Array.isArray(body?.assessmentDocumentIds)
        ? body.assessmentDocumentIds.filter((value: unknown) => typeof value === "string")
        : [];

      if (assessmentDocumentIds.length === 0) {
        return NextResponse.json({ error: "At least one assessment is required" }, { status: 400 });
      }

      const assessmentSettings =
        body?.assessmentSettings && typeof body.assessmentSettings === "object"
          ? body.assessmentSettings
          : undefined;

      const weightError = validateAssessmentStackPayload({
        assessmentDocumentIds,
        assessmentSettings,
      });
      if (weightError) {
        return NextResponse.json({ error: weightError }, { status: 400 });
      }

      const [workspace, catalogue] = await Promise.all([
        recruitment.getCampaign(campaignId),
        recruitment.listAssessmentCatalogue(),
      ]);
      const assessments = assessmentDocumentIds.map((selectedId) => {
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
          assessmentSettings as Record<string, unknown> | undefined,
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
          weight: readAssessmentWeight(
            assessmentSettings as Record<string, unknown> | undefined,
            item.slug,
            selectedId,
          ),
        };
      });
      await recruitment.replaceAssessmentStack(campaignId, {
        expectedVersion: workspace.campaign.version,
        assessments,
        idempotencyKey: recruitmentIdempotencyKey(
          "campaign:assessment-stack",
          actor.userId,
          { campaignId, assessments },
        ),
      });

      return NextResponse.json({ data: { updated: true } });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Assessment stack could not be updated",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    return handleBffRouteError(error, "Assessment stack could not be updated");
  }
}
