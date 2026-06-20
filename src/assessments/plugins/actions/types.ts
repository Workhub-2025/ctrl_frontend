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
    timeLimitSeconds?: number;
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
    timeLimitSeconds?: number;
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

export type StmRecallQuestion = {
  id: string;
  factKey?: string;
  type: 'short_text' | 'multiple_choice';
  prompt: string;
  options?: Array<{ id: string; label: string }>;
};

export type StmRound = {
  id: string;
  information?: {
    modality?: string;
    displaySeconds?: number;
    prompt?: string;
    audioSrc?: string | null;
    facts?: Array<{
      key: string;
      label: string;
      weight?: number;
      category?: string;
      critical?: boolean;
    }>;
  } | null;
  distraction?: {
    type?: string;
    durationSeconds?: number;
    items?: Array<{ id: string; prompt: string }>;
  } | null;
  recallQuestions?: StmRecallQuestion[];
};

export type StmSessionData = {
  sessionId: string | null;
  assessmentId: string | null;
  runs: StmRound[];
  config?: {
    roundCount?: number;
    informationSeconds?: number;
    distractionSeconds?: number;
    recallSeconds?: number;
    timeLimitSeconds?: number;
    passingScore?: number;
    version?: string;
    difficulty?: string;
  };
};
