import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/next-auth-options";
import { canAccessEqualityMonitoring } from "@/lib/profile-authority";
import { routeForRole } from "@/lib/auth/role-model";

export default async function EqualityMonitoringLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  if (!canAccessEqualityMonitoring(session.user.role)) {
    redirect(routeForRole(session.user.role));
  }
  return children;
}
