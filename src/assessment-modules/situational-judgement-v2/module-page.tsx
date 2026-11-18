"use client";

import { useCallback, useEffect, useRef } from "react";
import { Check, CircleHelp } from "lucide-react";
import { OperationalReadinessPage } from "../shared/operational-readiness-page";
import { TrackedAssessmentShell } from "../shared/tracked-assessment-shell";
import type { LaunchEnvelope } from "../types";

type Option = { id: string; label: string };
type Scenario = { id: string; number: number; title: string; stem: string; options: Option[] };
type Practice = Omit<Scenario, "number">;
type Content = { scenarios: Scenario[] };
type Response = {
  bestOptionId: string;
  worstOptionId: string;
  elapsedSeconds: number;
  enteredAt?: number;
};
type State = { responses: Record<string, Response> };

function responseState(scenarios: Array<Pick<Scenario, "id">>): State {
  return {
    responses: Object.fromEntries(
      scenarios.map((scenario) => [
        scenario.id,
        { bestOptionId: "", worstOptionId: "", elapsedSeconds: 0 },
      ]),
    ),
  };
}

function BestWorstWorkspace({
  scenario,
  response,
  onChange,
  practice = false,
  scenarioTotal,
}: {
  scenario: Scenario | Practice;
  response: Response;
  onChange: (response: Response) => void;
  practice?: boolean;
  scenarioTotal?: number;
}) {
  const enteredAt = useRef(response.enteredAt ?? Date.now());

  useEffect(() => {
    if (response.enteredAt) {
      enteredAt.current = response.enteredAt;
      return;
    }
    onChange({ ...response, enteredAt: enteredAt.current });
    // Persist entry time once for dwell measurement across resume.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (kind: "bestOptionId" | "worstOptionId", optionId: string) => {
    const other = kind === "bestOptionId" ? "worstOptionId" : "bestOptionId";
    const elapsedSeconds = Math.max(
      1,
      Math.floor((Date.now() - enteredAt.current) / 1_000),
    );
    onChange({
      ...response,
      [kind]: optionId,
      elapsedSeconds,
      enteredAt: enteredAt.current,
      ...(response[other] === optionId ? { [other]: "" } : {}),
    });
  };

  return (
    <section className="border border-border bg-card" aria-labelledby={`${scenario.id}-title`}>
      <div className="border-b border-border px-5 py-5 sm:px-6">
        {practice ? <p className="text-sm text-muted-foreground">Unscored practice</p> : null}
        <h1 id={`${scenario.id}-title`} className="text-xl font-semibold">{scenario.title}</h1>
        <p className="mt-3 max-w-[70ch] text-base leading-7 text-foreground">{scenario.stem}</p>
        <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
          <CircleHelp className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
          Pick the most effective and the least effective response. One response can't be both.
        </p>
      </div>

      <fieldset>
        <legend className="sr-only">Choose the most and least effective responses</legend>
        <ul className="divide-y divide-border">
          {scenario.options.map((option) => {
            const best = response.bestOptionId === option.id;
            const worst = response.worstOptionId === option.id;
            return (
              <li
                key={option.id}
                className={`grid gap-3 border-l-2 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6 ${
                  best ? "border-l-success bg-success/5" : worst ? "border-l-destructive bg-destructive/5" : "border-l-transparent"
                }`}
              >
                <p className="text-sm leading-6">
                  <span className="mr-2 font-semibold">{option.id}.</span>
                  {option.label}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:w-[19rem]">
                  <ChoiceButton
                    name={`${scenario.id}-best`}
                    value={option.id}
                    checked={best}
                    tone="success"
                    label="Most effective"
                    accessibleLabel={`${option.id}: most effective`}
                    onSelect={() => choose("bestOptionId", option.id)}
                  />
                  <ChoiceButton
                    name={`${scenario.id}-worst`}
                    value={option.id}
                    checked={worst}
                    tone="destructive"
                    label="Least effective"
                    accessibleLabel={`${option.id}: least effective`}
                    onSelect={() => choose("worstOptionId", option.id)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </fieldset>
    </section>
  );
}

/** A radio input drawn as a full-size button, so the target is the whole label. */
function ChoiceButton({
  name,
  value,
  checked,
  tone,
  label,
  accessibleLabel,
  onSelect,
}: {
  name: string;
  value: string;
  checked: boolean;
  tone: "success" | "destructive";
  label: string;
  accessibleLabel: string;
  onSelect: () => void;
}) {
  const selected =
    tone === "success"
      ? "border-success bg-success/15 text-foreground"
      : "border-destructive bg-destructive/15 text-foreground";
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-sm border px-3 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
        checked ? selected : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
        aria-label={accessibleLabel}
        className="sr-only"
      />
      {checked ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
      {label}
    </label>
  );
}

function Assessed({ launch }: { launch: LaunchEnvelope<Content> }) {
  const scenarioCount = launch.content.scenarios.length;
  return (
    <TrackedAssessmentShell<Content, State>
      launch={launch}
      title="Situational Judgement Assessment"
      restartNoun="scenario order"
      initialState={(content) => responseState(content.scenarios)}
      validateStage={(stage, state) => {
        if (stage >= 1 && stage <= scenarioCount) {
          const scenario = launch.content.scenarios[stage - 1];
          const response = state.responses[scenario.id];
          if (!response?.bestOptionId || !response.worstOptionId) return "Select both the most effective and least effective response.";
          if (response.bestOptionId === response.worstOptionId) return "The same response cannot be selected in both columns.";
        }
        return null;
      }}
      buildSubmission={(state) => ({
        scenarios: launch.content.scenarios.map((scenario) => {
          const response = state.responses[scenario.id];
          const dwell =
            response.elapsedSeconds ||
            (response.enteredAt
              ? Math.max(1, Math.floor((Date.now() - response.enteredAt) / 1_000))
              : 1);
          return {
            scenarioId: scenario.id,
            bestOptionId: response.bestOptionId,
            worstOptionId: response.worstOptionId,
            elapsedSeconds: dwell,
          };
        }),
      })}
      continueLabel={(stage) =>
        stage === 0
          ? "Start scenario 1"
          : stage < scenarioCount
            ? "Next scenario"
            : "Review responses"
      }
      renderStage={({ stageIndex, state, setState }, content) => {
        if (stageIndex === 0) {
          return (
            <section className="border border-border bg-card p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Monitoring active</p>
              <h1 className="mt-2 text-2xl font-semibold">{scenarioCount} judgement scenarios</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                For each situation, identify the response you consider most effective and the response you consider least effective. Work from the facts shown; no prior role knowledge is required.
              </p>
            </section>
          );
        }
        if (stageIndex >= 1 && stageIndex <= scenarioCount) {
          const scenario = content.scenarios[stageIndex - 1];
          return (
            <BestWorstWorkspace
              scenario={scenario}
              scenarioTotal={scenarioCount}
              response={state.responses[scenario.id]}
              onChange={(next) =>
                setState({ responses: { ...state.responses, [scenario.id]: next } })
              }
            />
          );
        }
        const completed = Object.values(state.responses).filter(
          (response) => response.bestOptionId && response.worstOptionId,
        ).length;
        return (
          <section className="border border-border bg-card p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Final review</p>
            <h1 className="mt-2 text-2xl font-semibold">Submit your decisions</h1>
            <div className="mt-5 flex items-center gap-4 border-y border-border py-4">
              <span className="grid h-10 w-10 place-items-center bg-primary/10 text-primary"><Check className="h-5 w-5" aria-hidden="true" /></span>
              <div>
                <p className="font-semibold tabular-nums">{completed} of {scenarioCount} scenarios complete</p>
                <p className="text-sm text-muted-foreground">Selections are scored after submission; no immediate result is shown.</p>
              </div>
            </div>
          </section>
        );
      }}
    />
  );
}

export function SituationalJudgementModulePage({ candidateSessionDocumentId, slug }: { candidateSessionDocumentId: string; slug: string }) {
  const createPracticeState = useCallback((practice: Practice) => responseState([practice]), []);
  return (
    <OperationalReadinessPage<Practice, State, Content>
      candidateSessionDocumentId={candidateSessionDocumentId}
      slug={slug}
      createPracticeState={createPracticeState}
      isPracticeComplete={(state) => {
        const response = Object.values(state.responses)[0];
        return Boolean(response?.bestOptionId && response?.worstOptionId);
      }}
      renderPractice={(practice, state, setState) => (
        <BestWorstWorkspace
          practice
          scenario={practice}
          response={state.responses[practice.id]}
          onChange={(next) => setState({ responses: { [practice.id]: next } })}
        />
      )}
      renderAssessment={(launch) => <Assessed launch={launch} />}
    />
  );
}
