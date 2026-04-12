"use client";

import { ClipboardList, Home, ListChecks, Users } from "lucide-react";
import { RoleDashboardShell } from "@/components/dashboard/role-dashboard-shell";

export default function HiringManagerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleDashboardShell
      title="Hiring manager dashboard"
      subtitle="Recruitment review and decision support"
      navItems={[
        { href: "/hiring-manager-dashboard", label: "Overview", icon: Home },
        {
          href: "/hiring-manager-dashboard#queue",
          label: "Review queue",
          icon: ClipboardList,
        },
        {
          href: "/hiring-manager-dashboard#shortlist",
          label: "Shortlist",
          icon: ListChecks,
        },
        {
          href: "/hiring-manager-dashboard#candidates",
          label: "Candidates",
          icon: Users,
        },
      ]}
    >
      {children}
    </RoleDashboardShell>
  );
}
