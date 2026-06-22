import { initAssessmentSession } from "@/assessments/plugins/actions/init-session";
import { TypingTestClient } from "@/app/assessment/typing/typing-test-client";
import { AssessmentShellPage } from "@/assessments/plugins/assessment-shell-page";
import { getAssessmentUiPlugin } from "@/assessments/plugins/registry";
import { notFound } from "next/navigation";
import type { TypingSessionData } from "@/store/typing-session.store";

type AssessmentPageProps = {
  searchParams?: Promise<{ candidateSessionDocumentId?: string }>;
};

export async function renderAssessmentPage(
  slug: string,
  { searchParams }: AssessmentPageProps,
) {
  const plugin = getAssessmentUiPlugin(slug);
  if (!plugin) notFound();

  const params = await searchParams;
  const candidateSessionDocumentId = params?.candidateSessionDocumentId ?? null;

  if (plugin.requiresServerInit && slug === "typing") {
    const session = await initAssessmentSession<TypingSessionData>(
      "typing",
      candidateSessionDocumentId,
    ).catch((err: unknown) => ({
      error: err instanceof Error ? err.message : "Failed to initialize session",
    }));

    return (
      <TypingTestClient
        initialSession={session as any}
        candidateSessionDocumentId={candidateSessionDocumentId}
      />
    );
  }

  return (
    <AssessmentShellPage
      assessmentSlug={plugin.slug}
      assessmentName={plugin.shellTitle ?? plugin.title}
      candidateSessionDocumentId={candidateSessionDocumentId}
    />
  );
}
