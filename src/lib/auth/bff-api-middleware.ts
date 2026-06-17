import { NextResponse } from "next/server";
import type { AppRole } from "@/lib/auth/role-model";
import { resolveAppRole } from "@/lib/auth/role-model";

type PortalApiRule = {
  prefix: string;
  role: AppRole;
};

const PORTAL_API_RULES: PortalApiRule[] = [
  { prefix: "/api/hiring-manager", role: "hiring_manager" },
  { prefix: "/api/client", role: "client" },
  { prefix: "/api/admin", role: "admin" },
];

export function guardPortalApiRoute(
  pathname: string,
  hasToken: boolean,
  tokenRole: unknown
): NextResponse | null {
  const rule = PORTAL_API_RULES.find(({ prefix }) => pathname.startsWith(prefix));
  if (!rule) return null;

  if (!hasToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const role = resolveAppRole(tokenRole);

  if (!role) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (role !== rule.role) {
    return NextResponse.json(
      { error: `${rule.role.replace("_", " ")} access required` },
      { status: 403 }
    );
  }

  return null;
}
