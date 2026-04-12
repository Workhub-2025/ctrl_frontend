"use client";

import { Building2, ClipboardList, Home, ShieldCheck } from "lucide-react";
import { RoleDashboardShell } from "@/components/dashboard/role-dashboard-shell";

export default function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleDashboardShell
      title="Client dashboard"
      subtitle="Programme visibility for client stakeholders"
      navItems={[
        { href: "/client-dashboard", label: "Overview", icon: Home },
        {
          href: "/client-dashboard#pipeline",
          label: "Pipeline",
          icon: ClipboardList,
        },
        {
          href: "/client-dashboard#governance",
          label: "Governance",
          icon: ShieldCheck,
        },
        {
          href: "/client-dashboard#delivery",
          label: "Delivery",
          icon: Building2,
        },
      ]}
    >
      {children}
    </RoleDashboardShell>
  );
}
