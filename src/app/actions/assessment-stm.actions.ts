'use server';

import { initAssessmentSession } from '@/assessments/plugins/actions/init-session';
import type { StmSessionData } from '@/assessments/plugins/actions/types';

export async function initStmSession(
  candidateSessionDocumentId?: string | null,
): Promise<StmSessionData> {
  return initAssessmentSession<StmSessionData>('short-term-memory', candidateSessionDocumentId);
}
