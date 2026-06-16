"use client";

import { ClipboardCheck, Home, MessageSquare, TrendingUp, Users } from "lucide-react";
import { RoleDashboardShell } from "@/components/dashboard/role-dashboard-shell";

export default function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleDashboardShell
      title="Client Portal"
      subtitle="Seat access, campaign approvals, and hiring-manager oversight"
      contentWidth="wide"
      navItems={[
        { href: "/client-dashboard/", label: "Overview", icon: Home },
        {
          href: "/client-dashboard/hiring-managers/",
          label: "Hiring Managers",
          icon: Users,
        },
        {
          href: "/client-dashboard/progressed/",
          label: "Approvals",
          icon: ClipboardCheck,
        },
        {
          href: "/client-dashboard/messages/",
          label: "Messages",
          icon: MessageSquare,
        },
        {
          href: "/client-dashboard/upgrade-requests/",
          label: "Upgrade Requests",
          icon: TrendingUp,
        },
      ]}
    >
      {children}
    </RoleDashboardShell>
  );
}
