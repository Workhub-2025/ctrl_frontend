"use client";

import { useCallback } from "react";
import { Check, CircleHelp } from "lucide-react";
import { OperationalReadinessPage } from "../shared/operational-readiness-page";
import { TrackedAssessmentShell } from "../shared/tracked-assessment-shell";
import type { LaunchEnvelope } from "../types";

type Option = { id: string; label: string };
type Scenario = { id: string; number: number; title: string; stem: string; options: Option[] };
type Practice = Omit<Scenario, "number">;
type Content = { scenarios: Scenario[] };
type Response = { bestOptionId: string; worstOptionId: string };
type State = { responses: Record<string, Response> };

function responseState(scenarios: Array<Pick<Scenario, "id">>): State {
  return { responses: Object.fromEntries(scenarios.map((scenario) => [scenario.id, { bestOptionId: "", worstOptionId: "" }])) };
}

function BestWorstWorkspace({ scenario, response, onChange, practice = false }: {
  scenario: Scenario | Practice;
  response: Response;
  onChange: (response: Response) => void;
  practice?: boolean;
}) {
  const choose = (kind: "bestOptionId" | "worstOptionId", optionId: string) => {
    const other = kind === "bestOptionId" ? "worstOptionId" : "bestOptionId";
    onChange({ ...response, [kind]: optionId, ...(response[other] === optionId ? { [other]: "" } : {}) });
  };
  return (
    <section className="border border-border bg-card" aria-labelledby={`${scenario.id}-title`}>
      <div className="border-b border-border px-5 py-5 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {practice ? "Unscored practice" : `Scenario ${"number" in scenario ? scenario.number : ""} of 20`}
        </p>
        <h1 id={`${scenario.id}-title`} className="mt-1 text-xl font-semibold">{scenario.title}</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-foreground">{scenario.stem}</p>
      </div>

      <fieldset>
        <legend className="sr-only">Choose the most and least effective responses</legend>
        <div className="grid grid-cols-[minmax(0,1fr)_72px_72px] border-b border-border bg-muted/30 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid-cols-[minmax(0,1fr)_120px_120px] sm:px-6">
          <span>Response</span>
          <span className="text-center">Most</span>
          <span className="text-center">Least</span>
        </div>
        <div className="divide-y divide-border">
          {scenario.options.map((option) => {
            const best = response.bestOptionId === option.id;
            const worst = response.worstOptionId === option.id;
            return (
              <div key={option.id} className={`grid grid-cols-[minmax(0,1fr)_72px_72px] items-center px-4 py-4 sm:grid-cols-[minmax(0,1fr)_120px_120px] sm:px-6 ${best || worst ? "bg-primary/5" : ""}`}>
                <p className="pr-3 text-sm leading-6"><span className="mr-2 font-semibold">{option.id}.</span>{option.label}</p>
                <label className="grid min-h-11 place-items-center" aria-label={`${option.label}: most effective`}>
                  <input
                    type="radio"
                    name={`${scenario.id}-best`}
                    value={option.id}
                    checked={best}
                    onChange={() => choose("bestOptionId", option.id)}
                    className="h-5 w-5 accent-primary"
                  />
                </label>
                <label className="grid min-h-11 place-items-center" aria-label={`${option.label}: least effective`}>
                  <input
                    type="radio"
                    name={`${scenario.id}-worst`}
                    value={option.id}
                    checked={worst}
                    onChange={() => choose("worstOptionId", option.id)}
                    className="h-5 w-5 accent-primary"
                  />
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>
      <div className="flex items-start gap-2 border-t border-border bg-muted/20 px-5 py-3 text-xs leading-5 text-muted-foreground">
        <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Choose one response in each column. The same response cannot be both most and least effective.
      </div>
    </section>
  );
}

function Assessed({ launch }: { launch: LaunchEnvelope<Content> }) {
  return (
    <TrackedAssessmentShell<Content, State>
      launch={launch}
      title="Situational Judgement Assessment"
      restartNoun="scenario order"
      initialState={(content) => responseState(content.scenarios)}
      validateStage={(stage, state) => {
        if (stage >= 1 && stage <= 20) {
          const scenario = launch.content.scenarios[stage - 1];
          const response = state.responses[scenario.id];
          if (!response?.bestOptionId || !response.worstOptionId) return "Select both the most effective and least effective response.";
          if (response.bestOptionId === response.worstOptionId) return "The same response cannot be selected in both columns.";
        }
        return null;
      }}
      buildSubmission={(state, elapsedSeconds) => ({
        scenarios: launch.content.scenarios.map((scenario) => ({
          scenarioId: scenario.id,
          ...state.responses[scenario.id],
          elapsedSeconds: Math.max(1, Math.round(elapsedSeconds / 20)),
        })),
      })}
      continueLabel={(stage) => stage === 0 ? "Start scenario 1" : stage < 20 ? "Save and open next scenario" : "Review responses"}
      renderStage={({ stageIndex, state, setState }, content) => {
        if (stageIndex === 0) return (
          <section className="border border-border bg-card p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Monitoring active</p>
            <h1 className="mt-2 text-2xl font-semibold">Twenty judgement scenarios</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              For each situation, identify the response you consider most effective and the response you consider least effective. Work from the facts shown; no prior role knowledge is required.
            </p>
          </section>
        );
        if (stageIndex >= 1 && stageIndex <= 20) {
          const scenario = content.scenarios[stageIndex - 1];
          return <BestWorstWorkspace scenario={scenario} response={state.responses[scenario.id]} onChange={(next) => setState({ responses: { ...state.responses, [scenario.id]: next } })} />;
        }
        const completed = Object.values(state.responses).filter((response) => response.bestOptionId && response.worstOptionId).length;
        return (
          <section className="border border-border bg-card p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Final review</p>
            <h1 className="mt-2 text-2xl font-semibold">Submit your decisions</h1>
            <div className="mt-5 flex items-center gap-4 border-y border-border py-4">
              <span className="grid h-10 w-10 place-items-center bg-primary/10 text-primary"><Check className="h-5 w-5" aria-hidden="true" /></span>
              <div>
                <p className="font-semibold tabular-nums">{completed} of 20 scenarios complete</p>
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
        return Boolean(response?.bestOptionId && response.worstOptionId && response.bestOptionId !== response.worstOptionId);
      }}
      renderPractice={(practice, state, setState) => (
        <BestWorstWorkspace practice scenario={practice} response={state.responses[practice.id]} onChange={(response) => setState({ responses: { [practice.id]: response } })} />
      )}
      renderAssessment={(launch) => <Assessed launch={launch} />}
    />
  );
}
