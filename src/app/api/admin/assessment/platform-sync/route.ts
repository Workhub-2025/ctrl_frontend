import { NextResponse } from "next/server";

import { requireAdminDualAccess } from "@/lib/auth/admin-dual-access";
import type { FirebaseAssessmentRelease } from "@/lib/firebase-admin-tenancy-bff";
import { invalidateAssessmentCatalogueCache } from "@/lib/portal-cache-keys";

export async function POST() {
  const auth = await requireAdminDualAccess("recovery.write");
  if ("error" in auth) return auth.error;

  try {
    const releases = await auth.domainApi.request<FirebaseAssessmentRelease[]>({
      path: "/v1/assessment-releases",
      firebaseSessionCookie: auth.firebaseSessionCookie,
    });
    await invalidateAssessmentCatalogueCache();
    return NextResponse.json({
      data: {
        synced: true,
        mode: "sql-releases",
        releaseCount: releases.length,
        releases: releases.map((release) => ({
          slug: release.slug,
          version: release.releaseVersion,
          status: release.status,
        })),
      },
    });
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
