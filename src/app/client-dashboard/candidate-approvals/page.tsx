import { redirect } from "next/navigation";

/** @deprecated Use /client-dashboard/client-approved-candidates */
export default function ClientCandidateApprovalsLegacyRedirect() {
  redirect("/client-dashboard/client-approved-candidates");
}
