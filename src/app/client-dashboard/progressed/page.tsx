import { redirect } from "next/navigation";

/** @deprecated Use /client-dashboard/campaigns */
export default function ClientApprovalsLegacyRedirect() {
  redirect("/client-dashboard/campaigns");
}
