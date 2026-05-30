'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  LogOut,
  Play,
} from 'lucide-react';
import { AssessmentGameShell } from '@/components/assessment/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { closeAssessmentWindow, notifyAssessmentCompleted } from '@/lib/assessment-completion';

type ScenarioOption = {
  id: string;
  text: string;
};

type Scenario = {
  id: string;
  title: string;
  scenario: string;
  prompt: string;
  options: ScenarioOption[];
};

type SjtContent = {
  practiceScenarios?: Scenario[];
  finalScenarios: Scenario[];
};

type Phase = 'landing' | 'rules' | 'scenario' | 'submitting' | 'submitted';

type SjtResponse = {
  scenarioId: string;
  bestOptionId: string;
  worstOptionId: string;
};

const CONTENT_URL = '/assessment-content/situational-judgement.json';

const fallbackContent: SjtContent = {
  finalScenarios: [
    {
      id: 'S1',
      title: 'Emotional overload',
      scenario:
        'You are speaking with someone who is very distressed. They talk quickly, repeat themselves, and jump between points. They sound tearful and occasionally raise their voice.',
      prompt: 'Select the MOST effective and LEAST effective response.',
      options: [
        { id: 'A', text: 'Let them continue uninterrupted so they feel heard, even if it takes time.' },
        { id: 'B', text: 'Calmly acknowledge how they feel, slow the pace, and ask one clear question at a time.' },
        { id: 'C', text: 'Interrupt firmly and tell them to calm down so you can understand them.' },
        { id: 'D', text: 'End the conversation quickly and refer them elsewhere.' },
      ],
    },
  ],
};

export default function SituationalJudgementTest() {
  const [phase, setPhase] = useState<Phase>('landing');
  const [content, setContent] = useState<SjtContent>(fallbackContent);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [bestOptionId, setBestOptionId] = useState<string | null>(null);
  const [worstOptionId, setWorstOptionId] = useState<string | null>(null);
  const [responses, setResponses] = useState<SjtResponse[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const startedAtRef = useRef<string | null>(null);

  const scenarios = content.finalScenarios;
  const activeScenario = scenarios[scenarioIndex] ?? scenarios[0] ?? fallbackContent.finalScenarios[0];
  const progress = scenarios.length > 0 ? ((scenarioIndex + 1) / scenarios.length) * 100 : 0;
  const canSubmitScenario = Boolean(bestOptionId && worstOptionId && bestOptionId !== worstOptionId);

  useEffect(() => {
    let cancelled = false;

    fetch(CONTENT_URL)
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load situational judgement content');
        return response.json() as Promise<SjtContent>;
      })
      .then((loadedContent) => {
        if (!cancelled && loadedContent.finalScenarios?.length) {
          setContent(loadedContent);
        }
      })
      .catch(() => {
        if (!cancelled) setContent(fallbackContent);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const startAssessment = useCallback(() => {
    startedAtRef.current = new Date().toISOString();
    setScenarioIndex(0);
    setBestOptionId(null);
    setWorstOptionId(null);
    setResponses([]);
    setSubmitError(null);
    setPhase('scenario');
  }, []);

  const closeAssessment = useCallback(() => {
    closeAssessmentWindow();
  }, []);

  const submitCurrentScenario = () => {
    if (!canSubmitScenario || !bestOptionId || !worstOptionId) return;

    const nextResponses = [
      ...responses,
      {
        scenarioId: activeScenario.id,
        bestOptionId,
        worstOptionId,
      },
    ];
    setResponses(nextResponses);
    setBestOptionId(null);
    setWorstOptionId(null);

    if (scenarioIndex >= scenarios.length - 1) {
      setPhase('submitting');
      return;
    }

    setScenarioIndex((currentIndex) => currentIndex + 1);
  };

  useEffect(() => {
    if (phase !== 'submitting') return;

    let cancelled = false;

    const submitAssessment = async () => {
      try {
        const response = await fetch('/api/assessment/situational-judgement/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            responses,
            startedAt: startedAtRef.current ?? new Date().toISOString(),
            completedAt: new Date().toISOString(),
          }),
        });

        if (cancelled) return;

        if (response.ok || response.status === 409) {
          notifyAssessmentCompleted('situational-judgement');
          setSubmitError(null);
        } else {
          const body = await response.json().catch(() => ({}));
          setSubmitError(
            (body as { error?: string }).error ??
              'Submission failed. Please contact support.'
          );
        }
      } catch {
        if (!cancelled) setSubmitError('Network error. Please contact support.');
      } finally {
        if (!cancelled) setPhase('submitted');
      }
    };

    void submitAssessment();

    return () => {
      cancelled = true;
    };
  }, [phase, responses]);

  const renderOption = (option: ScenarioOption) => {
    const isBest = bestOptionId === option.id;
    const isWorst = worstOptionId === option.id;

    return (
      <div
        key={option.id}
        className={[
          'rounded-xl border p-4 transition',
          isBest || isWorst
            ? 'border-primary/50 bg-primary/5'
            : 'border-border bg-card dark:border-white/10 dark:bg-white/[0.03]',
        ].join(' ')}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border font-mono text-sm font-semibold text-muted-foreground dark:border-white/10">
            {option.id}
          </div>
          <p className="min-h-16 flex-1 text-sm leading-6 text-foreground">{option.text}</p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant={isBest ? 'default' : 'outline'}
            onClick={() => {
              setBestOptionId(option.id);
              if (worstOptionId === option.id) setWorstOptionId(null);
            }}
          >
            Most effective
          </Button>
          <Button
            type="button"
            variant={isWorst ? 'default' : 'outline'}
            onClick={() => {
              setWorstOptionId(option.id);
              if (bestOptionId === option.id) setBestOptionId(null);
            }}
          >
            Least effective
          </Button>
        </div>
      </div>
    );
  };

  return (
    <AssessmentGameShell
      icon={ClipboardCheck}
      title="Situational Judgement Assessment"
      eyebrow="CTRL assessment"
      status={phase === 'scenario' ? `Scenario ${scenarioIndex + 1}/${scenarios.length}` : 'Best and worst judgement'}
    >
      {phase === 'landing' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ClipboardCheck className="h-8 w-8" />
          </div>
          <p className="max-w-2xl text-2xl font-semibold leading-tight tracking-normal text-foreground sm:text-3xl">
            Situational Judgement Assessment
          </p>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Read each scenario and choose the most effective and least effective response.
          </p>
          <Button className="mt-8 h-12 px-7" size="lg" onClick={() => setPhase('rules')}>
            Start Assessment
            <Play className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {phase === 'rules' && (
        <div className="mx-auto flex min-h-[520px] w-full max-w-3xl flex-col justify-center">
          <Badge className="mb-5 w-fit" variant="secondary">
            How this assessment works
          </Badge>
          <p className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            You will make two selections for each scenario.
          </p>
          <div className="mt-6 grid gap-3 text-sm leading-6 text-muted-foreground sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">20 scenarios</p>
              <p className="mt-1">Each scenario has four possible responses.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Best and worst</p>
              <p className="mt-1">Select one most effective and one least effective response.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">No duplicate choices</p>
              <p className="mt-1">The same response cannot be both best and worst.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">No result shown</p>
              <p className="mt-1">Your result is saved for the Hiring Manager report.</p>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-12" onClick={startAssessment}>
              Begin scenarios
              <Play className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="h-12" onClick={() => setPhase('landing')}>
              Back
            </Button>
          </div>
        </div>
      )}

      {phase === 'scenario' && (
        <div className="mx-auto flex min-h-[560px] w-full max-w-[1180px] flex-col justify-center">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Scenario {scenarioIndex + 1}
                </p>
                <p className="mt-1 text-xl font-semibold text-foreground">{activeScenario.title}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{scenarioIndex + 1}/{scenarios.length}</Badge>
                <Badge variant="outline">Best + worst</Badge>
              </div>
            </div>
            <Progress value={progress} className="mt-4 h-2" />
          </div>

          <div className="mt-5 rounded-xl border border-border bg-card p-5 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Scenario
            </p>
            <p className="mt-3 text-lg leading-8 text-foreground">{activeScenario.scenario}</p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {activeScenario.options.map(renderOption)}
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Select one most effective and one least effective response.
            </p>
            <Button onClick={submitCurrentScenario} disabled={!canSubmitScenario}>
              {scenarioIndex >= scenarios.length - 1 ? 'Submit assessment' : 'Next scenario'}
            </Button>
          </div>
        </div>
      )}

      {phase === 'submitting' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Final scenario complete
          </p>
          <p className="mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Submitting assessment
          </p>
          <p className="mt-4 max-w-md text-muted-foreground">
            Please keep this window open while your situational judgement assessment is saved.
          </p>
        </div>
      )}

      {phase === 'submitted' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Assessment submitted
          </p>
          <p className="mt-4 max-w-md text-muted-foreground">
            {submitError
              ? submitError
              : 'Thank you. Your assessment has been submitted successfully. Please complete any remaining assessments or await further information from the Hiring Manager.'}
          </p>
          <Button variant="outline" className="mt-8 h-11 px-6" onClick={closeAssessment}>
            <LogOut className="mr-2 h-4 w-4" />
            Close assessment
          </Button>
        </div>
      )}
    </AssessmentGameShell>
  );
}
