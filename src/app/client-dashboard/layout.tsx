"use client";

import { Home, UserCheck, MessageSquare } from "lucide-react";
import { RoleDashboardShell } from "@/components/dashboard/role-dashboard-shell";

export default function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleDashboardShell
      title="Client dashboard"
      subtitle="Review progressed candidates and communicate with your Hiring Manager"
      navItems={[
        { href: "/client-dashboard/", label: "Overview", icon: Home },
        {
          href: "/client-dashboard/progressed/",
          label: "Progressed Candidates",
          icon: UserCheck,
        },
        {
          href: "/client-dashboard/messages/",
          label: "HM Communications",
          icon: MessageSquare,
        },
      ]}
    >
      {children}
    </RoleDashboardShell>
  );
}
