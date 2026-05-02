'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Play,
  RotateCcw,
} from 'lucide-react';
import { AssessmentGameShell } from '@/components/assessment/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

type Scenario = {
  id: string;
  scenario: string;
  prompt: string;
  options: string[];
};

type SjtContent = {
  practiceScenarios: Scenario[];
  finalScenarios: Scenario[];
};

type Phase =
  | 'landing'
  | 'rules'
  | 'practice-scenario'
  | 'practice-review'
  | 'practice-complete'
  | 'final-scenario'
  | 'submitting'
  | 'submitted';

type AnswerSnapshot = {
  mode: 'practice' | 'final';
  scenarioNumber: number;
  scenarioId: string;
  selectedOption: number;
};

const CONTENT_URL = '/assessment-content/situational-judgement.json';

const fallbackContent: SjtContent = {
  practiceScenarios: [
    {
      id: 'fallback-practice',
      scenario:
        'A caller is distressed and speaking quickly. You have not confirmed their exact location.',
      prompt: 'Which response is most appropriate?',
      options: [
        'Ask them to calm down and start again.',
        'Politely interrupt to confirm the exact location and immediate danger.',
        'Transfer the call immediately.',
        'Wait silently until they finish.',
      ],
    },
  ],
  finalScenarios: [],
};

export default function SituationalJudgementTest() {
  const [phase, setPhase] = useState<Phase>('landing');
  const [content, setContent] = useState<SjtContent>(fallbackContent);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [finalIndex, setFinalIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerSnapshot[]>([]);

  const activeMode: 'practice' | 'final' =
    phase === 'final-scenario' || phase === 'submitting' || phase === 'submitted'
      ? 'final'
      : 'practice';
  const activeScenarios =
    activeMode === 'practice' ? content.practiceScenarios : content.finalScenarios;
  const activeIndex = activeMode === 'practice' ? practiceIndex : finalIndex;
  const activeScenario =
    activeScenarios[activeIndex] ??
    activeScenarios[0] ??
    fallbackContent.practiceScenarios[0];
  const latestAnswer = answers[answers.length - 1];
  const finalProgress =
    content.finalScenarios.length > 0
      ? ((finalIndex + 1) / content.finalScenarios.length) * 100
      : 0;

  useEffect(() => {
    let cancelled = false;

    fetch(CONTENT_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Unable to load situational judgement content');
        }
        return response.json() as Promise<SjtContent>;
      })
      .then((loadedContent) => {
        if (
          !cancelled &&
          loadedContent.practiceScenarios?.length &&
          loadedContent.finalScenarios?.length
        ) {
          setContent(loadedContent);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setContent(fallbackContent);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const startPractice = useCallback(() => {
    setPracticeIndex(0);
    setFinalIndex(0);
    setSelectedOption(null);
    setAnswers([]);
    setPhase('practice-scenario');
  }, []);

  const startFinal = useCallback(() => {
    setFinalIndex(0);
    setSelectedOption(null);
    setPhase('final-scenario');
  }, []);

  const resetAssessment = useCallback(() => {
    setPracticeIndex(0);
    setFinalIndex(0);
    setSelectedOption(null);
    setAnswers([]);
    setPhase('landing');
  }, []);

  const recordAnswer = (mode: 'practice' | 'final') => {
    if (selectedOption === null) return;

    const scenarioNumber = mode === 'practice' ? practiceIndex + 1 : finalIndex + 1;
    setAnswers((currentAnswers) => [
      ...currentAnswers,
      {
        mode,
        scenarioNumber,
        scenarioId: activeScenario.id,
        selectedOption,
      },
    ]);

    if (mode === 'practice') {
      if (practiceIndex >= content.practiceScenarios.length - 1) {
        setPhase('practice-complete');
        return;
      }

      setPhase('practice-review');
      return;
    }

    if (finalIndex >= content.finalScenarios.length - 1) {
      setPhase('submitting');
      return;
    }

    setFinalIndex((currentIndex) => currentIndex + 1);
    setSelectedOption(null);
  };

  const continuePractice = () => {
    setPracticeIndex((currentIndex) => currentIndex + 1);
    setSelectedOption(null);
    setPhase('practice-scenario');
  };

  useEffect(() => {
    if (phase !== 'submitting') return;

    const timerId = window.setTimeout(() => {
      setPhase('submitted');
    }, 2600);

    return () => window.clearTimeout(timerId);
  }, [phase]);

  const renderScenario = (mode: 'practice' | 'final') => {
    const isFinal = mode === 'final';
    const scenarioNumber = isFinal ? finalIndex + 1 : practiceIndex + 1;
    const totalScenarios = isFinal
      ? content.finalScenarios.length
      : content.practiceScenarios.length;

    return (
      <div className="mx-auto flex min-h-[560px] w-full max-w-[1180px] flex-col justify-center">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Response selection
              </p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                Which response is most appropriate?
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Read the scenario carefully, then choose the response you would
                take first.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {isFinal ? 'Final' : 'Practice'} {scenarioNumber}/{totalScenarios}
              </Badge>
              <Badge variant="outline">4 responses</Badge>
            </div>
          </div>
          {isFinal && <Progress value={finalProgress} className="mt-4 h-2" />}
        </div>

        <div className="mt-5 rounded-xl border border-border bg-card p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Scenario
          </p>
          <p className="mt-3 text-lg leading-8 text-foreground">
            {activeScenario.scenario}
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {activeScenario.options.map((option, optionIndex) => {
            const isSelected = selectedOption === optionIndex;

            return (
              <button
                key={`${activeScenario.id}-${optionIndex}`}
                type="button"
                onClick={() => setSelectedOption(optionIndex)}
                className={[
                  'min-h-32 rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-[0_14px_34px_rgba(2,6,23,0.14)]',
                  isSelected
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                    : 'border-border bg-card dark:border-white/10 dark:bg-white/[0.03]',
                ].join(' ')}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={[
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border font-mono text-sm font-semibold',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-muted-foreground dark:border-white/10',
                    ].join(' ')}
                  >
                    {String.fromCharCode(65 + optionIndex)}
                  </div>
                  <p className="text-sm leading-6 text-foreground">{option}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Select one response before continuing.
          </p>
          <Button
            onClick={() => recordAnswer(mode)}
            disabled={selectedOption === null}
          >
            {isFinal ? 'Submit response' : 'Complete practice scenario'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <AssessmentGameShell
      icon={ClipboardCheck}
      title="Situational Judgement"
      eyebrow="CTRL assessment"
      status={
        phase === 'final-scenario'
          ? `Final scenario ${finalIndex + 1}/10`
          : phase === 'practice-scenario'
            ? `Practice scenario ${practiceIndex + 1}/3`
            : 'Response selection'
      }
    >
      {phase === 'landing' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ClipboardCheck className="h-8 w-8" />
          </div>
          <p className="max-w-2xl text-2xl font-semibold leading-tight tracking-normal text-foreground sm:text-3xl">
            Response Selection
          </p>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Read realistic control-room scenarios and choose the response that
            is most appropriate.
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
            How this test works
          </Badge>
          <p className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Choose the most appropriate response for each scenario.
          </p>
          <div className="mt-6 grid gap-3 text-sm leading-6 text-muted-foreground sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Practice block</p>
              <p className="mt-1">3 scenarios to get familiar with the format.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Final block</p>
              <p className="mt-1">10 scenarios submitted without showing a score.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Selection rule</p>
              <p className="mt-1">Pick one response: the action you would take first.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Judgement</p>
              <p className="mt-1">Consider safety, urgency, location, and accurate information gathering.</p>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-12" onClick={startPractice}>
              Start practice block
              <Play className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12"
              onClick={() => setPhase('landing')}
            >
              Back
            </Button>
          </div>
        </div>
      )}

      {phase === 'practice-scenario' && renderScenario('practice')}
      {phase === 'final-scenario' && renderScenario('final')}

      {phase === 'practice-review' && latestAnswer && (
        <div className="mx-auto flex min-h-[520px] w-full max-w-3xl flex-col justify-center text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Practice scenario {latestAnswer.scenarioNumber} complete
          </p>
          <p className="mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Response recorded
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            The next practice scenario will use the same format. Read the
            situation carefully and choose the response you would take first.
          </p>
          <Button size="lg" className="mx-auto mt-8 h-12 px-8" onClick={continuePractice}>
            Continue practice
          </Button>
        </div>
      )}

      {phase === 'practice-complete' && (
        <div className="mx-auto flex min-h-[520px] w-full max-w-3xl flex-col justify-center text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ClipboardCheck className="h-7 w-7" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Practice complete
          </p>
          <p className="mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Final response selection next
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Take a break before pressing continue. The final block has 10
            scenarios and no result is shown at the end.
          </p>
          <div className="mx-auto mt-7 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Safety first</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Consider immediate danger and caller safety.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Location matters</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Confirming where help is needed is often critical.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Choose first action</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Pick the response you would take first, not every later step.
              </p>
            </div>
          </div>
          <Button size="lg" className="mx-auto mt-8 h-12 px-8" onClick={startFinal}>
            Continue to final block
          </Button>
        </div>
      )}

      {phase === 'submitting' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Final block complete
          </p>
          <p className="mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Submitting assessment
          </p>
          <p className="mt-4 max-w-md text-muted-foreground">
            Please keep this window open while your situational judgement
            assessment is prepared for submission.
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
            Your situational judgement assessment has been completed. No final
            score is shown on this screen.
          </p>
          <Button variant="outline" className="mt-8 h-11 px-6" onClick={resetAssessment}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset visual demo
          </Button>
        </div>
      )}
    </AssessmentGameShell>
  );
}
