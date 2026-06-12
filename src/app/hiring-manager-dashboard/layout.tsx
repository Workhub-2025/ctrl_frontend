"use client";

import {
  BookOpenCheck,
  FolderKanban,
  Headset,
  LayoutDashboard,
  Layers3,
  Users,
} from "lucide-react";
import { RoleDashboardShell } from "@/components/dashboard/role-dashboard-shell";

export default function HiringManagerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleDashboardShell
      title="Hiring Manager Portal"
      subtitle="Campaign operations, candidate completion, and report-ready review"
      navItems={[
        {
          href: "/hiring-manager-dashboard/",
          label: "Overview",
          icon: LayoutDashboard,
        },
        {
          href: "/hiring-manager-dashboard/campaigns/",
          label: "Campaigns",
          icon: FolderKanban,
        },
        {
          href: "/hiring-manager-dashboard/sessions/",
          label: "Sessions",
          icon: Layers3,
        },
        {
          href: "/hiring-manager-dashboard/candidates/",
          label: "Candidates",
          icon: Users,
        },
        {
          href: "/hiring-manager-dashboard/assessments/",
          label: "Assessments",
          icon: BookOpenCheck,
        },
        {
          href: "/hiring-manager-dashboard/support/",
          label: "Support",
          icon: Headset,
        },
      ]}
    >
      {children}
    </RoleDashboardShell>
  );
}
