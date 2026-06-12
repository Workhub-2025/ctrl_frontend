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
      subtitle="Assessment access, progress, and support"
      contentWidth="wide"
      navItems={[
        {
          href: "/candidate-dashboard/",
          label: "Overview",
          icon: LayoutDashboard,
        },
        {
          href: "/candidate-dashboard/my-assessments/",
          label: "My Assessments",
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
