import { HiringManagerShell } from "@/components/dashboard/hiring-manager-shell";

export default function HiringManagerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HiringManagerShell>{children}</HiringManagerShell>;
}
