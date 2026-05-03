import { fetchAssessmentTypingRuns } from '@/app/actions/assessment-typing-texts.actions';
import { TypingTestClient } from './typing-test-client';

/**
 * TypingTestPage
 *
 * Server Component: fetches typing run texts from Strapi before rendering.
 * The client-side shell and secure exit logic live in TypingTestClient.
 */
export default async function TypingTestPage() {
  const initialRuns = await fetchAssessmentTypingRuns().catch(() => []);

  return <TypingTestClient initialRuns={initialRuns} />;
}
