import { initTypingSession } from "@/assessments/plugins/actions/typing-session";
import { TypingTestClient } from "@/app/assessment/typing/typing-test-client";
import { AssessmentShellPage } from "@/assessments/plugins/assessment-shell-page";
import { getAssessmentUiPlugin } from "@/assessments/plugins/registry";
import { notFound } from "next/navigation";

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
    const session = await initTypingSession(candidateSessionDocumentId).catch(() => null);

    return (
      <TypingTestClient
        initialSession={session}
        candidateSessionDocumentId={candidateSessionDocumentId}
      />
    );
  }

  return (
    <AssessmentShellPage
      plugin={plugin}
      candidateSessionDocumentId={candidateSessionDocumentId}
    />
  );
}
