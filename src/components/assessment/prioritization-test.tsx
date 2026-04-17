'use client';

import { ListOrdered } from 'lucide-react';
import { SimulatedAssessmentPlaceholder } from '@/components/assessment/simulated-assessment-placeholder';

export default function PrioritizationTest() {
  return (
    <SimulatedAssessmentPlaceholder
      icon={ListOrdered}
      title="Prioritization Assessment"
      description="This interactive assessment is currently under development. Once completed, candidates will rank and manage incoming incident queues here."
      completionKey="prioritization"
    />
  );
}