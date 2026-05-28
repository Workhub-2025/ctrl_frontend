import { initTypingSession } from '@/app/actions/assessment-typing-texts.actions';
import { TypingTestClient } from './typing-test-client';

/**
 * TypingTestPage
 *
 * Server Component: initialises a typing session on Strapi before rendering.
 * The session includes randomly selected texts and assessment config.
 * The client-side shell hydrates the session into useTypingSessionStore.
 */
export default async function TypingTestPage() {
  const session = await initTypingSession().catch(() => null);

  return <TypingTestClient initialSession={session} />;
}
