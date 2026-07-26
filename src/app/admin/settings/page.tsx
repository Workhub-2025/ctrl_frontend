import { redirect } from "next/navigation";

export default function AdminSecuritySettingsPage() {
  redirect("/profile?tab=security");
}
