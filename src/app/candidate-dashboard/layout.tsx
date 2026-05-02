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
      ]}
      hideSidebar={true}
    >
      {children}
    </RoleDashboardShell>
  );
}
