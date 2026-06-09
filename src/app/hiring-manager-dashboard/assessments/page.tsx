import { HiringManagerAssessmentLibrary } from "@/components/dashboard/hiring-manager-assessment-library";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { getHiringManagerAssessments } from "@/services/hiring-manager-assessments.service";
import { BookOpenCheck, Clock, Settings2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HiringManagerAssessmentsPage() {
  const { assessments, error } = await getHiringManagerAssessments();

  return (
    <div className="max-w-7xl space-y-6">
      <HiringManagerPageHeader
        eyebrow="Assessment library"
        title="Assessments"
        description="Browse assessment modules, duration, measured skills, and operational relevance."
        icon={BookOpenCheck}
        notice={
          error ? (
            <p className="max-w-3xl rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-700 dark:text-amber-100">
              {error}
            </p>
          ) : null
        }
      />

      <HiringManagerAssessmentLibrary assessments={assessments} />
    </div>
  );
}
