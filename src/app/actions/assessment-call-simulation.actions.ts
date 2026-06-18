'use server';

import { initAssessmentSession } from '@/assessments/plugins/actions/init-session';
import type { CallSimulationSessionData } from '@/assessments/plugins/actions/types';

export async function initCallSimulationSession(
  candidateSessionDocumentId?: string | null,
): Promise<CallSimulationSessionData> {
  return initAssessmentSession<CallSimulationSessionData>('call-simulation', candidateSessionDocumentId);
}
