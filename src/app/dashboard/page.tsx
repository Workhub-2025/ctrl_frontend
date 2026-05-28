import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { routeForRole } from "@/lib/auth/role-model";

export const metadata = {
  title: "Dashboard Redirect",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  redirect(routeForRole(session?.user?.role));
}
