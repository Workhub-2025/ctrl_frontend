'use server';

import { initAssessmentSession } from '@/assessments/plugins/actions/init-session';
import type { SjaSessionData } from '@/assessments/plugins/actions/types';

export async function initSjaSession(
  candidateSessionDocumentId?: string | null,
): Promise<SjaSessionData> {
  return initAssessmentSession<SjaSessionData>('situational-judgement', candidateSessionDocumentId);
}
