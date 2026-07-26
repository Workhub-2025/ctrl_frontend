import { redirect } from "next/navigation";

/** @deprecated Use /client-dashboard/billing. Remove after 2026-10-31. */
export default function ClientUpgradeRequestsRedirect() {
  redirect("/client-dashboard/billing");
}
