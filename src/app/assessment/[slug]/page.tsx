import {
  getAssessmentRenderer,
  listAssessmentModuleSlugs,
} from "@/assessment-modules/registry";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return listAssessmentModuleSlugs().map((slug) => ({ slug }));
}

export default async function AssessmentSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ candidateSessionDocumentId?: string }>;
}) {
  const { slug } = await params;
  const renderer = getAssessmentRenderer(slug);
  if (!renderer) notFound();
  const query = await searchParams;
  const candidateSessionDocumentId = query?.candidateSessionDocumentId?.trim();
  if (!candidateSessionDocumentId) notFound();
  const ReadinessComponent = renderer.ReadinessComponent;
  return (
    <ReadinessComponent
      slug={slug}
      candidateSessionDocumentId={candidateSessionDocumentId}
    />
  );
}
