import { AssessmentRecoveryWorkspace } from "@/components/admin/assessment-recovery-workspace";
import { getServerStrapiClient } from "@/lib/strapi";
import { notFound } from "next/navigation";

async function canAccessAssessmentRecovery() {
  try {
    const strapiClient = await getServerStrapiClient();
    const response = await strapiClient.fetch("/users/me?populate[client]=true&populate[access_code][populate][client]=true");
    if (!response.ok) return false;
    const user = await response.json();
    const features = user?.client?.features ?? user?.access_code?.client?.features ?? {};
    return features?.assessmentRecovery === true;
  } catch {
    return false;
  }
}

export default async function HiringManagerAssessmentRecoveryPage() {
  if (!(await canAccessAssessmentRecovery())) {
    notFound();
  }

  return (
    <AssessmentRecoveryWorkspace
      scope="portal"
      title="Assessment recovery"
      description="Review abandoned assessment snapshots for campaigns where recovery auditing is enabled."
    />
  );
}
