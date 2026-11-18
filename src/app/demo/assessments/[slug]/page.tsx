import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAssessmentRenderer } from "@/assessment-modules/registry";
import { assessmentDemosEnabled } from "../demo-fixtures";
import { DemoAssessment } from "./demo-assessment";

export const metadata: Metadata = {
  title: "Assessment demo",
  robots: { index: false, follow: false },
};

export default async function AssessmentDemoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ integrity?: string }>;
}) {
  if (!assessmentDemosEnabled) notFound();
  const { slug } = await params;
  if (!getAssessmentRenderer(slug)) notFound();
  const query = await searchParams;
  return <DemoAssessment slug={slug} integrity={query?.integrity === "on"} />;
}
