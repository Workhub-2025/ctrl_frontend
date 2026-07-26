import { redirect } from "next/navigation";

export default async function OrganizationDetailAdapter({
  params,
}: Readonly<{ params: Promise<{ organizationId: string }> }>) {
  const { organizationId } = await params;
  redirect(`/admin/clients/${encodeURIComponent(organizationId)}`);
}
