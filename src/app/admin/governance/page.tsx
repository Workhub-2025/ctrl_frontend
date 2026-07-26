import { redirect } from "next/navigation";

export default function AdminGovernanceAdapter() {
  redirect("/admin/audit-logs");
}
