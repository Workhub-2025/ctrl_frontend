"use client";

import { ClipboardList, HelpCircle, Home, ShieldCheck } from "lucide-react";
import { RoleDashboardShell } from "@/components/dashboard/role-dashboard-shell";

export default function CandidateDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleDashboardShell
      title="Candidate dashboard"
      subtitle="Assessment access and submission status"
      navItems={[
        { href: "/candidate-dashboard", label: "Overview", icon: Home },
        {
          href: "/candidate-dashboard/my-assessments",
          label: "My Assessments",
          icon: ClipboardList,
        },
        {
          href: "/candidate-dashboard/help-support",
          label: "Help & Support",
          icon: HelpCircle,
        },
        {
          href: "/candidate-dashboard/next-steps",
          label: "Next Steps",
          icon: ShieldCheck,
        },
      ]}
    >
      {children}
    </RoleDashboardShell>
  );
}
