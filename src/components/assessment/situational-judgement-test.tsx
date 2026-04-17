'use client';

import { ClipboardCheck } from 'lucide-react';
import { SimulatedAssessmentPlaceholder } from '@/components/assessment/simulated-assessment-placeholder';

export default function SituationalJudgementTest() {
  return (
    <SimulatedAssessmentPlaceholder
      icon={ClipboardCheck}
      title="Situational Judgement Test"
      description="This interactive assessment is currently under development. Once completed, candidates will read scenarios and make decisions here."
      completionKey="situational-judgement"
    />
  );
}
