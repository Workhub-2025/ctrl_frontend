import { listAssessmentSlugs } from "@/assessments/plugins/registry";
import { renderAssessmentPage } from "@/assessments/plugins/render-assessment-page";

export function generateStaticParams() {
  return listAssessmentSlugs().map((slug) => ({ slug }));
}

export default async function AssessmentSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ candidateSessionDocumentId?: string }>;
}) {
  const { slug } = await params;
  return renderAssessmentPage(slug, { searchParams });
}
