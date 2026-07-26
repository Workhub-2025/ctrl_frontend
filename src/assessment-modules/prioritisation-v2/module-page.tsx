"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Clock3, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { assessmentTimerAnnouncement } from "@/lib/assessment-accessibility";
import { OperationalReadinessPage } from "../shared/operational-readiness-page";
import { TrackedAssessmentShell } from "../shared/tracked-assessment-shell";
import type { LaunchEnvelope } from "../types";

type Incident = {
  id: string;
  label: string;
  title: string;
  description: string;
  timeOfIncident: string;
};
type Question = { id: string; number: number; difficulty: string; incidents: Incident[] };
type Practice = { title: string; instructions: string; questions: Question[] };
type Content = { questions: Question[] };
type RankingResponse = { order: string[]; confirmed: boolean; timeTakenSeconds: number };
type State = { responses: Record<string, RankingResponse>; practiceIndex: number };

function createState(questions: Question[]): State {
  return {
    practiceIndex: 0,
    responses: Object.fromEntries(questions.map((question) => [
      question.id,
      { order: question.incidents.map((incident) => incident.id), confirmed: false, timeTakenSeconds: 0 },
    ])),
  };
}

function RankingWorkspace({
  question,
  response,
  onChange,
  questionSeconds,
  onTimeout,
  practice = false,
}: {
  question: Question;
  response: RankingResponse;
  onChange: (response: RankingResponse) => void;
  questionSeconds?: number;
  onTimeout?: (response: RankingResponse) => void;
  practice?: boolean;
}) {
  const [startedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const [timerAnnouncement, setTimerAnnouncement] = useState("");
  const previousRemaining = useRef<number | null>(null);
  const timedOut = useRef(false);
  const incidentById = new Map(question.incidents.map((incident) => [incident.id, incident]));
  const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1_000));
  const remainingSeconds = questionSeconds === undefined ? null : Math.max(0, questionSeconds - elapsedSeconds);

  useEffect(() => {
    if (questionSeconds === undefined || response.confirmed) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [questionSeconds, response.confirmed]);

  useEffect(() => {
    if (remainingSeconds !== 0 || response.confirmed || timedOut.current || !onTimeout) return;
    timedOut.current = true;
    onTimeout({ ...response, confirmed: true, timeTakenSeconds: questionSeconds ?? elapsedSeconds });
  }, [elapsedSeconds, onTimeout, questionSeconds, remainingSeconds, response]);

  useEffect(() => {
    if (remainingSeconds === null) return;
    const announcement = assessmentTimerAnnouncement(
      previousRemaining.current,
      remainingSeconds,
    );
    previousRemaining.current = remainingSeconds;
    if (announcement) setTimerAnnouncement(announcement);
  }, [remainingSeconds]);

  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= response.order.length) return;
    const order = [...response.order];
    [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
    onChange({ order, confirmed: false, timeTakenSeconds: elapsedSeconds });
  };

  return (
    <section className="border border-border bg-card" aria-labelledby={`${question.id}-title`}>
      <div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {practice ? "Practice question" : `Question ${question.number} of 15`}
          </p>
          <h1 id={`${question.id}-title`} className="mt-1 text-xl font-semibold">
            Rank the six incidents
          </h1>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">1 = highest priority · 6 = lowest priority</p>
          {remainingSeconds !== null ? (
            <p
              className="mt-1 font-mono text-sm font-semibold tabular-nums"
              aria-label={`${remainingSeconds} seconds remaining for this question`}
            >
              {String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:{String(remainingSeconds % 60).padStart(2, "0")} remaining
            </p>
          ) : null}
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {timerAnnouncement}
          </p>
        </div>
      </div>

      <ol className="divide-y divide-border" aria-label="Incident ranking">
        {response.order.map((incidentId, index) => {
          const incident = incidentById.get(incidentId);
          if (!incident) return null;
          return (
            <li key={incident.id} className="grid gap-3 p-4 sm:grid-cols-[48px_minmax(0,1fr)_96px] sm:items-center">
              <div className="flex items-center gap-2 sm:block">
                <span className="grid h-11 w-11 place-items-center border border-primary bg-primary/10 text-lg font-semibold tabular-nums text-primary" aria-label={`Priority ${index + 1}`}>
                  {index + 1}
                </span>
                <GripVertical className="h-4 w-4 text-muted-foreground sm:hidden" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="font-semibold text-foreground">{incident.title}</h2>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> {incident.timeOfIncident}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{incident.description}</p>
              </div>
              <div className="flex gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-sm"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`Move ${incident.title} higher`}
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-sm"
                  disabled={index === response.order.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`Move ${incident.title} lower`}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-muted-foreground">
          Check the full order before confirming. Scoring rationale is not shown during the assessment.
        </p>
        <Button
          type="button"
          variant={response.confirmed ? "outline" : "default"}
          className="min-h-11 shrink-0 rounded-sm"
          onClick={() => onChange({ ...response, confirmed: true, timeTakenSeconds: elapsedSeconds })}
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {response.confirmed ? "Order confirmed" : "Confirm this order"}
        </Button>
      </div>
    </section>
  );
}

function PracticeWorkspace({ practice, state, setState }: { practice: Practice; state: State; setState: (state: State) => void }) {
  const question = practice.questions[state.practiceIndex];
  const response = state.responses[question.id];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 border border-border bg-card" aria-label="Practice questions">
        {practice.questions.map((item, index) => {
          const confirmed = state.responses[item.id].confirmed;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={state.practiceIndex === index}
              className={`flex min-h-12 items-center justify-center gap-2 border-r border-border px-3 text-sm font-medium last:border-r-0 ${state.practiceIndex === index ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
              onClick={() => setState({ ...state, practiceIndex: index })}
            >
              {confirmed ? <Check className="h-4 w-4 text-primary" aria-hidden="true" /> : null}
              Practice {index + 1}
            </button>
          );
        })}
      </div>
      <RankingWorkspace
        key={question.id}
        practice
        question={question}
        response={response}
        onChange={(next) => setState({ ...state, responses: { ...state.responses, [question.id]: next } })}
      />
    </div>
  );
}

function Assessed({ launch }: { launch: LaunchEnvelope<Content> }) {
  const questionSeconds = Math.round(180 + (launch.extraTimeMinutes * 60) / 15);
  return (
    <TrackedAssessmentShell<Content, State>
      launch={launch}
      title="Prioritisation Judgement Assessment"
      restartNoun="question order"
      initialState={(content) => createState(content.questions)}
      validateStage={(stage, state) => {
        if (stage >= 1 && stage <= 15) {
          const question = launch.content.questions[stage - 1];
          if (!state.responses[question.id]?.confirmed) return "Confirm the complete ranking before continuing.";
        }
        return null;
      }}
      buildSubmission={(state, elapsedSeconds) => ({
        questions: launch.content.questions.map((question) => ({
          questionId: question.id,
          submittedOrder: state.responses[question.id].order,
          timeTakenSeconds: Math.max(1, state.responses[question.id].timeTakenSeconds || Math.round(elapsedSeconds / 15)),
        })),
      })}
      continueLabel={(stage) => stage === 0 ? "Start question 1" : stage < 15 ? "Save and open next question" : "Review responses"}
      renderStage={({ stageIndex, state, setState, advance, isSaving }, content) => {
        if (stageIndex === 0) return (
          <section className="border border-border bg-card p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Monitoring active</p>
            <h1 className="mt-2 text-2xl font-semibold">Fifteen ranking decisions</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              Each question contains six incidents. Put every incident into a unique position from 1 to 6, then confirm the order. You have up to three minutes per question within the overall assessment time.
            </p>
          </section>
        );
        if (stageIndex >= 1 && stageIndex <= 15) {
          const question = content.questions[stageIndex - 1];
          return (
            <RankingWorkspace
              key={question.id}
              question={question}
              questionSeconds={questionSeconds}
              response={state.responses[question.id]}
              onChange={(next) => setState({ ...state, responses: { ...state.responses, [question.id]: next } })}
              onTimeout={(next) => {
                const nextState = { ...state, responses: { ...state.responses, [question.id]: next } };
                setState(nextState);
                if (!isSaving) void advance(nextState);
              }}
            />
          );
        }
        const confirmed = Object.values(state.responses).filter((response) => response.confirmed).length;
        return (
          <section className="border border-border bg-card p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Final review</p>
            <h1 className="mt-2 text-2xl font-semibold">Submit your rankings</h1>
            <div className="mt-5 flex items-center gap-4 border-y border-border py-4">
              <span className="grid h-10 w-10 place-items-center bg-primary/10 text-primary"><Check className="h-5 w-5" aria-hidden="true" /></span>
              <div>
                <p className="font-semibold tabular-nums">{confirmed} of 15 questions confirmed</p>
                <p className="text-sm text-muted-foreground">Your score is not shown after submission.</p>
              </div>
            </div>
          </section>
        );
      }}
    />
  );
}

export function PrioritisationModulePage({ candidateSessionDocumentId, slug }: { candidateSessionDocumentId: string; slug: string }) {
  const createPracticeState = useCallback((practice: Practice) => createState(practice.questions), []);
  return (
    <OperationalReadinessPage<Practice, State, Content>
      candidateSessionDocumentId={candidateSessionDocumentId}
      slug={slug}
      createPracticeState={createPracticeState}
      isPracticeComplete={(state) => Object.values(state.responses).every((response) => response.confirmed)}
      renderPractice={(practice, state, setState) => <PracticeWorkspace practice={practice} state={state} setState={setState} />}
      renderAssessment={(launch) => <Assessed launch={launch} />}
    />
  );
}
