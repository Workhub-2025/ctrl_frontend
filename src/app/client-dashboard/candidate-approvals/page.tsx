import { redirect } from "next/navigation";

/** @deprecated Use /client-dashboard/candidates. Remove after 2026-10-31. */
export default function ClientCandidateApprovalsLegacyRedirect() {
  redirect("/client-dashboard/candidates");
}
