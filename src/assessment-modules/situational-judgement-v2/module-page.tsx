"use client";

import { useCallback } from "react";
import { OperationalReadinessPage } from "../shared/operational-readiness-page";
import { TrackedAssessmentShell } from "../shared/tracked-assessment-shell";
import type { LaunchEnvelope } from "../types";

type Action = { id: string; label: string; consequence: string };
type Scenario = {
  id: string;
  stratum: string;
  title: string;
  context: string;
  question: string;
  actions: Action[];
  followUpQuestion: string;
  followUpActions: Action[];
};
type Practice = Pick<
  Scenario,
  "id" | "title" | "context" | "question" | "actions" | "stratum"
>;
type ScenarioResponse = {
  scenarioId: string;
  actionId: string;
  followUpActionId: string;
  rationale: string;
};
type State = { scenarios: ScenarioResponse[] };
type Content = { scenarios: Scenario[] };

function DecisionCard({
  scenario,
  response,
  onChange,
  practice = false,
}: {
  scenario: Scenario | Practice;
  response: ScenarioResponse;
  onChange: (response: ScenarioResponse) => void;
  practice?: boolean;
}) {
  const firstAction = scenario.actions.find(
    (action) => action.id === response.actionId,
  );
  const hasFollowUp = "followUpActions" in scenario;
  return (
    <section className="border border-border bg-card p-6  ">
      <div className="border-b border-border pb-5 ">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {practice
            ? "Unscored practice"
            : scenario.stratum.replaceAll("-", " ")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold">{scenario.title}</h1>
        <p className="mt-4 leading-7 text-foreground ">
          {scenario.context}
        </p>
      </div>
      <fieldset className="mt-6">
        <legend className="font-semibold">{scenario.question}</legend>
        <div className="mt-3 space-y-2">
          {scenario.actions.map((action) => (
            <label
              key={action.id}
              className={`block cursor-pointer border p-4 text-sm leading-6 ${response.actionId === action.id ? "border-primary bg-primary/10  " : "border-border "}`}
            >
              <input
                className="mr-3"
                type="radio"
                name={`${scenario.id}-action`}
                value={action.id}
                checked={response.actionId === action.id}
                onChange={() =>
                  onChange({
                    ...response,
                    actionId: action.id,
                    followUpActionId: "",
                  })
                }
              />
              {action.label}
            </label>
          ))}
        </div>
      </fieldset>
      {firstAction ? (
        <div className="mt-5 border-l-4 border-border bg-muted p-4 text-sm leading-6 ">
          <strong>Consequence:</strong> {firstAction.consequence}
        </div>
      ) : null}
      {hasFollowUp && firstAction ? (
        <>
          <fieldset className="mt-6">
            <legend className="font-semibold">
              {scenario.followUpQuestion}
            </legend>
            <div className="mt-3 space-y-2">
              {scenario.followUpActions.map((action) => (
                <label
                  key={action.id}
                  className={`block cursor-pointer border p-4 text-sm leading-6 ${response.followUpActionId === action.id ? "border-primary bg-primary/10  " : "border-border "}`}
                >
                  <input
                    className="mr-3"
                    type="radio"
                    name={`${scenario.id}-follow-up`}
                    value={action.id}
                    checked={response.followUpActionId === action.id}
                    onChange={() =>
                      onChange({ ...response, followUpActionId: action.id })
                    }
                  />
                  {action.label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="mt-6 block text-sm font-semibold">
            Decision rationale
            <textarea
              className="mt-2 min-h-28 w-full border border-border bg-card p-3 font-normal "
              value={response.rationale}
              onChange={(event) =>
                onChange({ ...response, rationale: event.target.value })
              }
              placeholder="Explain the evidence and risk considerations behind both decisions."
            />
          </label>
        </>
      ) : null}
    </section>
  );
}

function Assessed({ launch }: { launch: LaunchEnvelope<Content> }) {
  return (
    <TrackedAssessmentShell
      launch={launch}
      title="Situational Judgement v2"
      restartNoun="scenario set"
      initialState={(content) => ({
        scenarios: content.scenarios.map((scenario) => ({
          scenarioId: scenario.id,
          actionId: "",
          followUpActionId: "",
          rationale: "",
        })),
      })}
      validateStage={(stage, state) => {
        if (stage >= 1 && stage <= 3) {
          const response = state.scenarios[stage - 1];
          if (!response?.actionId || !response.followUpActionId)
            return "Make both operational decisions before continuing.";
          if (response.rationale.trim().length < 30)
            return "Provide a concise evidence-led rationale of at least 30 characters.";
        }
        return null;
      }}
      buildSubmission={(state, elapsedSeconds) => ({
        scenarios: state.scenarios.map((response) => ({
          ...response,
          elapsedSeconds: Math.max(1, Math.round(elapsedSeconds / 3)),
        })),
      })}
      renderStage={({ stageIndex, state, setState }, content) => {
        if (stageIndex === 0)
          return (
            <section className="border border-border bg-card p-7  ">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                Monitoring active
              </p>
              <h1 className="mt-2 text-2xl font-semibold">
                Three accountable decisions
              </h1>
              <p className="mt-4 max-w-3xl leading-7 text-foreground ">
                Each scenario requires a first action, a response to its
                consequence and a short rationale. The situations cover
                immediate risk, safeguarding and professional judgement.
              </p>
            </section>
          );
        if (stageIndex >= 1 && stageIndex <= 3) {
          const scenario = content.scenarios[stageIndex - 1];
          const response = state.scenarios[stageIndex - 1];
          return (
            <DecisionCard
              scenario={scenario}
              response={response}
              onChange={(next) =>
                setState({
                  scenarios: state.scenarios.map((entry, index) =>
                    index === stageIndex - 1 ? next : entry,
                  ),
                })
              }
            />
          );
        }
        return (
          <section className="border border-border bg-card p-7  ">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Final review
            </p>
            <h1 className="mt-2 text-2xl font-semibold">
              Submit your decisions
            </h1>
            <p className="mt-4 leading-7 text-foreground ">
              You have completed all three scenarios. Your choices, rationales
              and timings will be submitted together. No immediate score will be
              shown.
            </p>
            <ul className="mt-5 divide-y divide-border border-y border-border  ">
              {content.scenarios.map((scenario) => (
                <li key={scenario.id} className="py-3 text-sm font-medium">
                  {scenario.title}
                </li>
              ))}
            </ul>
          </section>
        );
      }}
    />
  );
}

export function SituationalJudgementModulePage({
  candidateSessionDocumentId,
  slug,
}: {
  candidateSessionDocumentId: string;
  slug: string;
}) {
  const createPracticeState = useCallback(
    (practice: Practice): State => ({
      scenarios: [
        {
          scenarioId: practice.id,
          actionId: "",
          followUpActionId: "",
          rationale: "",
        },
      ],
    }),
    [],
  );
  return (
    <OperationalReadinessPage<Practice, State, Content>
      candidateSessionDocumentId={candidateSessionDocumentId}
      slug={slug}
      createPracticeState={createPracticeState}
      isPracticeComplete={(state) => Boolean(state.scenarios[0]?.actionId)}
      renderPractice={(practice, state, setState) => (
        <DecisionCard
          practice
          scenario={practice}
          response={state.scenarios[0]}
          onChange={(response) => setState({ scenarios: [response] })}
        />
      )}
      renderAssessment={(launch) => <Assessed launch={launch} />}
    />
  );
}
