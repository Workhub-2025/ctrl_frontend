import { NextResponse } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import {
  toAdminOverviewFromOrganizations,
  type FirebaseClientTeamWorkspace,
  type FirebaseOrganization,
} from "@/lib/firebase-admin-tenancy-bff";
import { getAdminOverview } from "@/services/admin-platform.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdminDualAccess("platform.overview");
    if ("error" in auth) return auth.error;

    if (isFirebaseAdminAuth(auth)) {
      const organizations = await auth.domainApi.request<FirebaseOrganization[]>({
        path: "/v1/organizations",
        firebaseSessionCookie: auth.firebaseSessionCookie,
      });
      const workspaces = await Promise.all(
        organizations.map((organization) =>
          auth.domainApi.request<FirebaseClientTeamWorkspace>({
            path: `/v1/organizations/${encodeURIComponent(organization.id)}/workspace`,
            firebaseSessionCookie: auth.firebaseSessionCookie,
          }),
        ),
      );
      return NextResponse.json({
        data: toAdminOverviewFromOrganizations(organizations, workspaces),
      });
    }

    const overview = await getAdminOverview(auth.cmsJwt);
    return NextResponse.json({ data: overview });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Admin overview could not be loaded",
      },
      { status: 500 },
    );
  }
}
