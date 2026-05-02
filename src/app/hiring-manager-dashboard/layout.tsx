"use client";

import { CalendarDays, Home, Send, Users } from "lucide-react";
import { RoleDashboardShell } from "@/components/dashboard/role-dashboard-shell";

export default function HiringManagerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleDashboardShell
      title="Hiring manager dashboard"
      subtitle="Campaigns, sessions, and candidate progression"
      navItems={[
        { href: "/hiring-manager-dashboard/", label: "Overview", icon: Home },
        {
          href: "/hiring-manager-dashboard/campaigns/",
          label: "Campaigns & Sessions",
          icon: CalendarDays,
        },
        {
          href: "/hiring-manager-dashboard/review/",
          label: "Candidate Review",
          icon: Users,
        },
        {
          href: "/hiring-manager-dashboard/handoff/",
          label: "Client Handoff",
          icon: Send,
        },
      ]}
    >
      {children}
    </RoleDashboardShell>
  );
}
