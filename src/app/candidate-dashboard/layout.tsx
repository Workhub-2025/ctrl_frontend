"use client";

import { BriefcaseBusiness, HelpCircle, LayoutDashboard } from "lucide-react";
import { RoleDashboardShell } from "@/components/dashboard/role-dashboard-shell";

export default function CandidateDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleDashboardShell
      title="Candidate Portal"
      subtitle="Campaign access, assessment progress, and support"
      contentWidth="wide"
      enableAccessibilityTools={true}
      navItems={[
        {
          href: "/candidate-dashboard/",
          label: "Dashboard",
          icon: LayoutDashboard,
        },
        {
          href: "/candidate-dashboard/my-campaigns/",
          label: "My Campaigns",
          icon: BriefcaseBusiness,
        },
        {
          href: "/candidate-dashboard/help-support/",
          label: "Help & Support",
          icon: HelpCircle,
        },
      ]}
    >
      {children}
    </RoleDashboardShell>
  );
}
