import { HiringManagerAssessmentLibrary } from "@/components/dashboard/hiring-manager-assessment-library";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { portalAlertErrorClass } from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import { getHiringManagerAssessments } from "@/services/hiring-manager-assessments.service";
import { BookOpenCheck, Clock, Settings2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HiringManagerAssessmentsPage() {
  const { assessments, error } = await getHiringManagerAssessments({
    includeVersions: false,
  });

  return (
    <div className="max-w-7xl space-y-6">
      <HiringManagerPageHeader
        eyebrow="Assessment library"
        title="Assessments"
        description="Browse assessment modules, duration, measured skills, and operational relevance."
        icon={BookOpenCheck}
        notice={
          error ? (
            <p className={cn(portalAlertErrorClass, "max-w-3xl text-xs leading-5")}>
              {error}
            </p>
          ) : null
        }
      />

      <HiringManagerAssessmentLibrary assessments={assessments} />
    </div>
  );
}
