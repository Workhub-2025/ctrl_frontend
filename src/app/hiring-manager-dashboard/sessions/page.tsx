import { redirect } from "next/navigation";

export default async function HiringManagerSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string; create?: string }>;
}) {
  const query = await searchParams;
  if (query.campaign) {
    const suffix = query.create === "1" ? "&create=1" : "";
    redirect(
      `/hiring-manager-dashboard/campaigns/${encodeURIComponent(query.campaign)}?tab=sessions${suffix}`
    );
  }

  redirect("/hiring-manager-dashboard/campaigns");
}
