"use client";

import { BriefcaseBusiness, HelpCircle, Route } from "lucide-react";
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
      navItems={[
        {
          href: "/candidate-dashboard/my-campaigns/",
          label: "My Campaigns",
          icon: BriefcaseBusiness,
        },
        {
          href: "/candidate-dashboard/next-steps/",
          label: "What To Do Next",
          icon: Route,
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
