import type { ComponentType } from "react";

export type AssessmentPageProps = {
  searchParams?: Promise<{ candidateSessionDocumentId?: string }>;
};

export type AssessmentUiPlugin = {
  slug: string;
  title: string;
  description: string;
  route: string;
  duration?: string;
  timed?: boolean;
  Page: ComponentType<AssessmentPageProps>;
};
