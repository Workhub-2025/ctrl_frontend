import { NextResponse } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import type { FirebaseAssessmentRelease } from "@/lib/firebase-admin-tenancy-bff";
import { invalidateAssessmentCatalogueCache } from "@/lib/portal-cache-keys";
import { getCmsApiBaseUrl, joinCmsApiPath } from "@/legacy-cms/server-url";

export async function POST() {
  const auth = await requireAdminDualAccess("recovery.write");
  if ("error" in auth) return auth.error;

  try {
    if (isFirebaseAdminAuth(auth)) {
      const releases = await auth.domainApi.request<FirebaseAssessmentRelease[]>({
        path: "/v1/assessment-releases",
        firebaseSessionCookie: auth.firebaseSessionCookie,
      });
      await invalidateAssessmentCatalogueCache();
      return NextResponse.json({
        data: {
          synced: true,
          mode: "firebase-releases",
          releaseCount: releases.length,
          releases: releases.map((release) => ({
            slug: release.slug,
            version: release.releaseVersion,
            status: release.status,
          })),
        },
      });
    }

    const response = await fetch(
      joinCmsApiPath(getCmsApiBaseUrl(), "/assessment/platform/sync"),
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.cmsJwt}`,
        },
      },
    );

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        body?.error?.message || body?.error || "Platform catalogue sync failed";
      return NextResponse.json({ error: message }, { status: response.status });
    }

    await invalidateAssessmentCatalogueCache();
    return NextResponse.json({ data: body?.data ?? null });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Platform catalogue sync failed",
      },
      { status: 500 },
    );
  }
}
