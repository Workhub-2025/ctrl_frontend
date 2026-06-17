import { initTypingSession } from "@/app/actions/assessment-typing-texts.actions";
import { TypingTestClient } from "@/app/assessment/typing/typing-test-client";
import type { AssessmentPageProps } from "./types";

/**
 * TypingTestPage
 *
 * Server Component: initialises a typing session on Strapi before rendering.
 * The session includes randomly selected texts and assessment config.
 * The client-side shell hydrates the session into useTypingSessionStore.
 */
export default async function TypingAssessmentPage({
  searchParams,
}: AssessmentPageProps) {
  const params = await searchParams;
  const session = await initTypingSession(
    params?.candidateSessionDocumentId ?? null
  ).catch(() => null);

  return (
    <TypingTestClient
      initialSession={session}
      candidateSessionDocumentId={params?.candidateSessionDocumentId ?? null}
    />
  );
}
