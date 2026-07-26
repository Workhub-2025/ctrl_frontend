import { NextResponse } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import {
  toAdminClientRow,
  type FirebaseClientTeamWorkspace,
  type FirebaseOrganization,
} from "@/lib/firebase-admin-tenancy-bff";
import { getAdminClients } from "@/services/admin-platform.service";

export async function GET() {
  try {
    const auth = await requireAdminDualAccess("clients.read");
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
        data: workspaces.map((workspace) =>
          toAdminClientRow(workspace.organization, workspace),
        ),
      });
    }

    const clients = await getAdminClients(auth.cmsJwt);
    return NextResponse.json({ data: clients });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Clients could not be loaded",
      },
      { status: 500 },
    );
  }
}
