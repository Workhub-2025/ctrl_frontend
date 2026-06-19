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

  let response;
  try {
    const client = await getServerStrapiClient();
    response = await client.fetch(plugin.strapiSessionPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateSessionDocumentId }),
    });
  } catch (err) {
    console.error(`[initAssessmentSession:${slug}] Network error — using fallback`, err);
    return EMPTY_SESSION as T;
  }

  if (!response.ok) {
    console.error(
      `[initAssessmentSession:${slug}] Strapi responded ${response.status}`
    );
    let errorMessage = 'Failed to load assessment';
    try {
      const errorData = await response.json();
      if (errorData?.error?.message) {
        errorMessage = errorData.error.message;
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      }
    } catch { /* ignore */ }
    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}
