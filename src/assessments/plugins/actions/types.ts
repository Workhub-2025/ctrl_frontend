export type SjaRun = {
  id: string;
  title: string;
  scenario: string;
  prompt: string;
  options: Array<{ id: string; text: string }>;
};

export type SjaSessionData = {
  sessionId: string | null;
  assessmentId: string | null;
  runs: SjaRun[];
  config?: {
    questionCount: number;
    version?: string;
    difficulty?: string;
  };
};

export type PjaIncident = {
  id: string;
  letter: string;
  title: string;
  description: string;
  timeOfIncident: string;
};

export type PjaRound = {
  id: string;
  title: string;
  type?: 'practice' | 'test';
  incidents: PjaIncident[];
  hiddenPriorityBands: Record<string, 'High' | 'Medium' | 'Low'>;
  suggestedOrder?: string[];
};

export type PjaSessionData = {
  sessionId: string | null;
  assessmentId: string | null;
  runs: PjaRound[];
  config?: {
    roundCount: number;
    version?: string;
    difficulty?: string;
  };
};

export type CallSimulationRun = {
  id: string;
  title: string;
  kind: 'practice' | 'final';
  scenarioKey: string;
  audioSrc: string;
};

export type CallSimulationSessionData = {
  sessionId: string | null;
  assessmentId: string | null;
  runs: CallSimulationRun[];
  config?: {
    callCount: number;
    version?: string;
    difficulty?: string;
  };
};
