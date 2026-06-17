import { redirect } from "next/navigation";

/** @deprecated Use /client-dashboard/campaign-approvals */
export default function ClientApprovalsLegacyRedirect() {
  redirect("/client-dashboard/campaign-approvals");
}
