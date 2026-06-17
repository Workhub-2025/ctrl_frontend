import { notFound } from "next/navigation";
import {
  getAssessmentPluginBySlug,
  listAssessmentSlugs,
} from "@/assessments/plugins/registry";
import type { AssessmentPageProps } from "@/assessments/plugins/types";

export function generateStaticParams() {
  return listAssessmentSlugs().map((slug) => ({ slug }));
}

export default async function AssessmentSlugPage({
  params,
  searchParams,
}: AssessmentPageProps & { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const plugin = getAssessmentPluginBySlug(slug);

  if (!plugin) {
    notFound();
  }

  const PageComponent = plugin.Page;
  return <PageComponent searchParams={searchParams} />;
}
