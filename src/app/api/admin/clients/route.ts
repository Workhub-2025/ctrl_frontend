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
      const response = await auth.domainApi.request<{
        data: {
          items: Array<{
            id: string;
            displayName: string;
            email: string;
            accountStatus: "active" | "suspended" | "closed";
            portalRole: "candidate" | "hiring_manager" | "client" | "admin";
            organizationId: string | null;
            organizationName: string | null;
            createdAt: string;
            updatedAt: string;
          }>;
        };
      }>({
        path: "/v1/screens/admin-clients",
        firebaseSessionCookie: auth.firebaseSessionCookie,
      });

      const clients = response.data.items
        .filter((user) => user.organizationId !== null)
        .map((user) => ({
          id: user.organizationId!,
          name: user.organizationName ?? user.displayName,
          status: user.accountStatus === "active" ? "Active" : "Paused",
          plan: "Firebase tenancy",
          seatsUsed: 1,
          seatsAllowed: 10,
          enabledAssessments: [],
          billingStatus: "Not configured",
          primaryContact: user.displayName || user.email,
          lastActivity: user.updatedAt,
          pendingCampaignApprovals: 0,
          hasClientContact: true,
          clientInviteStatus: "none" as const,
          clientInviteExpiresAt: null,
          canGenerateClientCode: false,
        }));

      return NextResponse.json({ data: clients });
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
