import { listAssessmentSubmitSlugs } from "@/assessments/plugins/submit/registry";
import { handleAssessmentSubmit } from "@/assessments/plugins/submit/handle-assessment-submit";

export function generateStaticParams() {
  return listAssessmentSubmitSlugs().map((slug) => ({ slug }));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  return handleAssessmentSubmit(slug, request);
}
