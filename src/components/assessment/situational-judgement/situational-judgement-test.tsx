'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ListChecks,
  Loader2,
  LogOut,
  Play,
  ShieldCheck,
  Target,
  Timer,
} from 'lucide-react';
import { AssessmentGameShell } from '@/components/assessment/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { closeAssessmentWindow, notifyAssessmentCompleted } from '@/lib/assessment-completion';
import { initSjaSession } from '@/app/actions/assessment-sja.actions';

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
const SJT_DURATION_SECONDS = 20 * 60;

const formatTimer = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const remainingSeconds = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
};

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

export default function SituationalJudgementTest({
  candidateSessionDocumentId,
}: {
  candidateSessionDocumentId?: string | null;
}) {
  const [phase, setPhase] = useState<Phase>('landing');
  const [content, setContent] = useState<SjtContent>(fallbackContent);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [bestOptionId, setBestOptionId] = useState<string | null>(null);
  const [worstOptionId, setWorstOptionId] = useState<string | null>(null);
  const [responses, setResponses] = useState<SjtResponse[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(SJT_DURATION_SECONDS);
  const startedAtRef = useRef<string | null>(null);

  const scenarios = content.finalScenarios;
  const activeScenario = scenarios[scenarioIndex] ?? scenarios[0] ?? fallbackContent.finalScenarios[0];
  const progress = scenarios.length > 0 ? ((scenarioIndex + 1) / scenarios.length) * 100 : 0;
  const timerProgress = ((SJT_DURATION_SECONDS - timeRemaining) / SJT_DURATION_SECONDS) * 100;
  const timerTone = timeRemaining <= 300 ? 'text-amber-600 dark:text-amber-300' : 'text-foreground';
  const canSubmitScenario = Boolean(bestOptionId && worstOptionId && bestOptionId !== worstOptionId);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const sessionData = await initSjaSession(candidateSessionDocumentId);
        if (cancelled) return;
        if (sessionData && sessionData.runs && sessionData.runs.length > 0) {
          setContent({ finalScenarios: sessionData.runs });
          return;
        }
      } catch (err) {
        console.error('[SituationalJudgementTest] Failed to load SJA session from backend:', err);
      }

      // Fallback: fetch static JSON
      try {
        const response = await fetch(CONTENT_URL);
        if (!response.ok) throw new Error('Unable to load situational judgement content');
        const loadedContent = await response.json() as SjtContent;
        if (!cancelled && loadedContent.finalScenarios?.length) {
          setContent(loadedContent);
        }
      } catch {
        if (!cancelled) setContent(fallbackContent);
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [candidateSessionDocumentId]);

  const startAssessment = useCallback(() => {
    startedAtRef.current = new Date().toISOString();
    setScenarioIndex(0);
    setBestOptionId(null);
    setWorstOptionId(null);
    setResponses([]);
    setSubmitError(null);
    setTimeRemaining(SJT_DURATION_SECONDS);
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
    if (phase !== 'scenario') return;

    if (timeRemaining <= 0) return;

    const timerId = window.setTimeout(() => {
      setTimeRemaining((currentValue) => Math.max(currentValue - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [phase, timeRemaining]);

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
            candidateSessionDocumentId,
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
  }, [candidateSessionDocumentId, phase, responses]);

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
      status={phase === 'scenario' ? `${formatTimer(timeRemaining)} remaining` : 'Best and worst judgement'}
    >
      {phase === 'landing' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className="mb-5 flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Secure judgement exercise
          </div>
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <ClipboardCheck className="h-8 w-8" aria-hidden="true" />
          </div>
          <p className="max-w-2xl text-2xl font-semibold leading-tight tracking-normal text-foreground sm:text-3xl">
            Situational Judgement Assessment
          </p>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Read each scenario and choose the most effective and least effective response.
          </p>
          <div className="mt-6 grid w-full max-w-2xl gap-3 text-left sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <Timer className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">20 minutes</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">A visual time bar stays on screen during the live scenarios.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <Target className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">Best and worst choice</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Select one most effective and one least effective action.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <ListChecks className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">Twenty live scenarios</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Your live judgement decisions are submitted securely.</p>
            </div>
          </div>
          <Button className="mt-8 h-12 px-7" size="lg" onClick={() => setPhase('rules')}>
            Start Assessment
            <Play className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {phase === 'rules' && (
        <div className="mx-auto flex min-h-[520px] w-full max-w-5xl flex-col justify-center py-10">
          <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10 text-primary">
                Behavioural judgement
              </Badge>
              <h1 className="mb-4 text-3xl font-semibold leading-tight text-foreground">CTRL Situational Judgement Assessment</h1>
              <p>
                This assessment is designed to understand how you are likely to respond in workplace situations involving communication, judgement, professionalism, empathy, integrity and decision-making.
              </p>
              <p className="mt-4">
                The assessment measures behavioural judgement, not job knowledge. You are not expected to have previous experience in policing, emergency services, customer service, contact centres or any specific profession. You should respond using your own judgement and select the actions you believe would be most and least effective in each situation.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mb-3 text-lg font-semibold text-foreground">What You Will See</h2>
                <p>Each scenario contains:</p>
                <div className="mt-4 grid gap-2">
                  {['A short workplace situation', 'Four possible actions labelled A, B, C and D'].map((item) => (
                    <div key={item} className="flex items-center gap-2 rounded-lg bg-muted p-3 text-foreground dark:bg-white/5">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <ListChecks className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mb-3 text-lg font-semibold text-foreground">Your Task</h2>
                <p>For each scenario, you must:</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-background p-4 text-center dark:border-white/10 dark:bg-white/[0.02]">
                    <p className="text-sm font-semibold text-foreground">MOST effective</p>
                    <p className="mt-1 text-xs text-muted-foreground">The strongest response.</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-4 text-center dark:border-white/10 dark:bg-white/[0.02]">
                    <p className="text-sm font-semibold text-foreground">LEAST effective</p>
                    <p className="mt-1 text-xs text-muted-foreground">The weakest response.</p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-700 dark:text-amber-300">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p>
                      You cannot select the same option as both MOST effective and LEAST effective.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <h2 className="mb-3 text-lg font-semibold text-foreground">How to Approach Each Scenario</h2>
              <p>When making your decisions, think about:</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  'Professional behaviour',
                  'Clear communication',
                  'Empathy and calm',
                  'Responsibility',
                  'Integrity and accuracy',
                  'Proportionate decisions',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-lg bg-muted p-3 text-foreground dark:bg-white/5">
                    <Target className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Timer className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">Practice Questions</h2>
                </div>
                <p>The assessment opens with practice guidance so you can understand the best-and-worst format before the live questions. Practice is not scored and does not affect your final result.</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-600 dark:text-green-400">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">Live Assessment Questions</h2>
                </div>
                <p>The live assessment contains 20 scored scenarios and has a 20-minute time limit. The time bar begins when you start the scenarios and remains visible throughout.</p>
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">Step-by-Step Instructions</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  'Start the live assessment when you are ready for the 20-minute timer',
                  'Read the situation carefully',
                  'Read all four actions before choosing',
                  'Choose the MOST effective action',
                  'Choose the LEAST effective action',
                  'Check that you have selected two different actions',
                  'Submit your answer and move to the next scenario',
                ].map((step, index) => (
                  <div key={step} className="rounded-lg bg-muted p-3 dark:bg-white/5">
                    <span className="font-semibold text-foreground">{index + 1}.</span> {step}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-border pt-8 dark:border-white/10 sm:flex-row">
            <Button size="lg" className="h-12" onClick={startAssessment}>
              Begin scenarios
              <Play className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
            <Button size="lg" variant="outline" className="h-12" onClick={() => setPhase('landing')}>
              Back
            </Button>
          </div>
        </div>
      )}

      {phase === 'scenario' && (
        <div className="mx-auto flex min-h-[560px] w-full max-w-[1180px] flex-col justify-center py-6">
          <div className="mb-5 rounded-xl border border-border bg-card p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  20-minute assessment timer
                </p>
                <p className={`mt-1 text-2xl font-semibold tabular-nums ${timerTone}`}>
                  {formatTimer(timeRemaining)}
                </p>
              </div>
              <Badge variant="outline" className={timeRemaining <= 300 ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300' : undefined}>
                {timeRemaining <= 300 ? 'Final 5 minutes' : 'Time-sensitive'}
              </Badge>
            </div>
            <Progress value={timerProgress} className="mt-4 h-2.5" />
          </div>

          <div className="mb-6 rounded-xl border border-border bg-card p-5 text-sm text-foreground shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <h3 className="mb-2 font-semibold text-base">Candidate Task Screen Instruction</h3>
            <p>Read the situation below.</p>
            <p>Review all four actions carefully.</p>
            <p className="mt-3 font-medium">Select:</p>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              <li><strong>MOST Effective</strong> – the action you believe would be the most effective response.</li>
              <li><strong>LEAST Effective</strong> – the action you believe would be the least effective response.</li>
            </ul>
            <p className="mt-3">You must select one MOST effective action and one LEAST effective action.</p>
            <p>You cannot select the same action twice.</p>
            <p className="mt-3 text-muted-foreground">Use your own judgement and consider professionalism, communication, empathy, responsibility, integrity and decision-making when making your choices.</p>
          </div>

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
              Situation
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
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
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
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
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
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
            Close assessment
          </Button>
        </div>
      )}
    </AssessmentGameShell>
  );
}
