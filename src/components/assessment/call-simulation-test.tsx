'use client';

import { Phone } from 'lucide-react';
import { SimulatedAssessmentPlaceholder } from '@/components/assessment/simulated-assessment-placeholder';

export default function CallSimulationTest() {
  return (
    <SimulatedAssessmentPlaceholder
      icon={Phone}
      title="Call Simulation"
      description="This interactive assessment is currently under development. Once completed, candidates will respond to audio call scenarios here."
      completionKey="call-simulation"
    />
  );
}
