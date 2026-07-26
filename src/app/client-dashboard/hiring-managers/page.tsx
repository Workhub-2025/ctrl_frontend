import { redirect } from "next/navigation";

/** @deprecated Use /client-dashboard/team. Remove after 2026-10-31. */
export default function ClientHiringManagersRedirect() {
  redirect("/client-dashboard/team");
}
