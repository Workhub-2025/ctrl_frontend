import { redirect } from "next/navigation";

/** @deprecated Use /client-dashboard/support. Remove after 2026-10-31. */
export default function ClientMessagesRedirect() {
  redirect("/client-dashboard/support");
}
