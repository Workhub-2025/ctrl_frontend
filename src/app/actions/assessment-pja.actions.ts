'use server';

import { initAssessmentSession } from '@/assessments/plugins/actions/init-session';
import type { PjaSessionData } from '@/assessments/plugins/actions/types';

export async function initPjaSession(
  candidateSessionDocumentId?: string | null,
): Promise<PjaSessionData> {
  return initAssessmentSession<PjaSessionData>('prioritisation', candidateSessionDocumentId);
}
