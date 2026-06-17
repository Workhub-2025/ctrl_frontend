'use server';

import { getActionAuthContext } from '@/lib/auth/server-action-auth';
import { getServerStrapiClient } from '@/lib/strapi';
import { getAssessmentUiPlugin } from '@/assessments/plugins/registry';

const EMPTY_SESSION = {
  sessionId: null,
  assessmentId: null,
  runs: [],
};

/**
 * Initialise an assessment session via Strapi for the authenticated candidate.
 * Register `strapiSessionPath` on each UI plugin — new assessments only need registry wiring.
 */
export async function initAssessmentSession<T = typeof EMPTY_SESSION>(
  slug: string,
  candidateSessionDocumentId?: string | null,
): Promise<T> {
  const plugin = getAssessmentUiPlugin(slug);
  if (!plugin?.strapiSessionPath) {
    throw new Error(`Unknown assessment slug: ${slug}`);
  }

  await getActionAuthContext(`initAssessmentSession:${slug}`);

  try {
    const client = await getServerStrapiClient();
    const response = await client.fetch(plugin.strapiSessionPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateSessionDocumentId }),
    });

    if (!response.ok) {
      console.error(
        `[initAssessmentSession:${slug}] Strapi responded ${response.status} — using fallback`,
      );
      return EMPTY_SESSION as T;
    }

    return (await response.json()) as T;
  } catch (err) {
    console.error(`[initAssessmentSession:${slug}] Network error — using fallback`, err);
    return EMPTY_SESSION as T;
  }
}
