import { ClientShell } from "@/components/dashboard/client/client-shell";

export default function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientShell>{children}</ClientShell>;
}
