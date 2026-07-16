"use client";

import { useCallback } from "react";
import { OperationalReadinessPage } from "../shared/operational-readiness-page";
import { TrackedAssessmentShell } from "../shared/tracked-assessment-shell";
import type { LaunchEnvelope } from "../types";

type Action = { id: string; label: string };
type Incident = {
  id: string;
  receivedAt: string;
  summary: string;
  operationalSignals: string[];
  location: string;
  availableActions: Action[];
};
type Update = { id: string; incidentId: string; message: string };
type Exercise = {
  id: string;
  title: string;
  controlContext: string;
  resources: string[];
  incidents: Incident[];
  updates: Update[];
};
type ResponseRow = { incidentId: string; rank: number; actionId: string };
type State = {
  initial: ResponseRow[];
  final: ResponseRow[];
  rationale: string;
};
type Content = { exercise: Exercise };
type Practice = Exercise;

function rowsFor(exercise: Exercise): ResponseRow[] {
  return exercise.incidents.map((incident) => ({
    incidentId: incident.id,
    rank: 0,
    actionId: "",
  }));
}

function QueueTable({
  exercise,
  rows,
  onChange,
  showActions = true,
}: {
  exercise: Exercise;
  rows: ResponseRow[];
  onChange: (rows: ResponseRow[]) => void;
  showActions?: boolean;
}) {
  const update = (incidentId: string, patch: Partial<ResponseRow>) =>
    onChange(
      rows.map((row) =>
        row.incidentId === incidentId ? { ...row, ...patch } : row,
      ),
    );
  return (
    <div className="overflow-x-auto border border-border bg-card  ">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground  ">
          <tr>
            <th className="p-3">Priority</th>
            <th className="p-3">Incident</th>
            <th className="p-3">Operational signals</th>
            {showActions ? <th className="p-3">Action</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-border ">
          {exercise.incidents.map((incident) => {
            const row = rows.find((item) => item.incidentId === incident.id)!;
            return (
              <tr key={incident.id} className="align-top">
                <td className="p-3">
                  <label className="sr-only" htmlFor={`rank-${incident.id}`}>
                    Priority for {incident.summary}
                  </label>
                  <select
                    id={`rank-${incident.id}`}
                    className="h-10 w-20 border border-border bg-card px-2 "
                    value={row.rank || ""}
                    onChange={(event) =>
                      update(incident.id, { rank: Number(event.target.value) })
                    }
                  >
                    <option value="">—</option>
                    {exercise.incidents.map((_, index) => (
                      <option key={index + 1} value={index + 1}>
                        {index + 1}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-3">
                  <p className="font-semibold">{incident.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {incident.receivedAt} · {incident.location}
                  </p>
                </td>
                <td className="p-3">
                  <ul className="space-y-1 text-xs leading-5">
                    {incident.operationalSignals.map((signal) => (
                      <li key={signal}>• {signal}</li>
                    ))}
                  </ul>
                </td>
                {showActions ? (
                  <td className="p-3">
                    <label
                      className="sr-only"
                      htmlFor={`action-${incident.id}`}
                    >
                      Action for {incident.summary}
                    </label>
                    <select
                      id={`action-${incident.id}`}
                      className="h-10 w-full min-w-56 border border-border bg-card px-2 "
                      value={row.actionId}
                      onChange={(event) =>
                        update(incident.id, { actionId: event.target.value })
                      }
                    >
                      <option value="">Choose action</option>
                      {incident.availableActions.map((action) => (
                        <option key={action.id} value={action.id}>
                          {action.label}
                        </option>
                      ))}
                    </select>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PracticeWorkspace({
  practice,
  state,
  setState,
}: {
  practice: Practice;
  state: State;
  setState: (state: State) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="border border-border bg-card p-5  ">
        <h3 className="font-semibold">{practice.title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground ">
          {practice.controlContext}
        </p>
      </div>
      <QueueTable
        exercise={practice}
        rows={state.initial}
        onChange={(initial) => setState({ ...state, initial })}
        showActions={false}
      />
      <label className="block border border-border bg-card p-4 text-sm font-semibold  ">
        Why is your first-ranked incident most urgent?
        <textarea
          className="mt-2 min-h-24 w-full border border-border bg-card p-3 font-normal "
          value={state.rationale}
          onChange={(event) =>
            setState({ ...state, rationale: event.target.value })
          }
        />
      </label>
    </div>
  );
}

function Assessed({ launch }: { launch: LaunchEnvelope<Content> }) {
  const exercise = launch.content.exercise;
  return (
    <TrackedAssessmentShell
      launch={launch}
      title="Prioritisation v2"
      restartNoun="incident queue"
      initialState={() => ({
        initial: rowsFor(exercise),
        final: rowsFor(exercise),
        rationale: "",
      })}
      validateStage={(stage, state) => {
        const validRows = (rows: ResponseRow[], actions: boolean) =>
          rows.every((row) => row.rank > 0 && (!actions || row.actionId)) &&
          new Set(rows.map((row) => row.rank)).size === rows.length;
        if (stage === 1 && !validRows(state.initial, true))
          return "Give every incident a unique priority and an initial action.";
        if (stage === 2 && !validRows(state.final, false))
          return "Re-rank the full queue after considering every update.";
        if (stage === 3 && !validRows(state.final, true))
          return "Choose a final action for every incident.";
        if (stage === 4 && state.rationale.trim().length < 40)
          return "Provide a concise rationale of at least 40 characters.";
        return null;
      }}
      buildSubmission={(state, elapsedSeconds) => ({
        exerciseId: exercise.id,
        initial: state.initial,
        final: state.final,
        rationale: state.rationale,
        elapsedSeconds,
      })}
      renderStage={({ stageIndex, state, setState }) => {
        if (stageIndex === 0)
          return (
            <Panel eyebrow="Monitoring active" title={exercise.title}>
              <p>{exercise.controlContext}</p>
              <h2 className="mt-5 font-semibold">Available resources</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {exercise.resources.map((resource) => (
                  <li key={resource}>• {resource}</li>
                ))}
              </ul>
            </Panel>
          );
        if (stageIndex === 1)
          return (
            <section>
              <StageTitle
                title="Set the initial queue"
                detail="Rank every incident and choose the action you would take with the available resources."
              />
              <QueueTable
                exercise={exercise}
                rows={state.initial}
                onChange={(initial) =>
                  setState({
                    ...state,
                    initial,
                    final: state.final.every((row) => row.rank === 0)
                      ? initial.map((row) => ({ ...row }))
                      : state.final,
                  })
                }
              />
            </section>
          );
        if (stageIndex === 2)
          return (
            <section>
              <StageTitle
                title="Reassess after new information"
                detail="Review each update, then set a complete revised priority order."
              />
              <div className="mb-5 space-y-2">
                {exercise.updates.map((update) => (
                  <div
                    key={update.id}
                    className="border-l-4 border-warning bg-warning/10 p-4 text-sm text-foreground  "
                  >
                    {update.message}
                  </div>
                ))}
              </div>
              <QueueTable
                exercise={exercise}
                rows={state.final}
                onChange={(final) => setState({ ...state, final })}
                showActions={false}
              />
            </section>
          );
        if (stageIndex === 3)
          return (
            <section>
              <StageTitle
                title="Confirm the resource plan"
                detail="Keep your revised order and choose the final operational action for each incident."
              />
              <QueueTable
                exercise={exercise}
                rows={state.final}
                onChange={(final) => setState({ ...state, final })}
              />
            </section>
          );
        if (stageIndex === 4)
          return (
            <Panel eyebrow="Decision record" title="Explain your final plan">
              <p className="text-sm text-muted-foreground ">
                Identify the risks, vulnerabilities, resource constraints and
                information that changed your priorities.
              </p>
              <textarea
                className="mt-5 min-h-48 w-full border border-border bg-card p-4 "
                value={state.rationale}
                onChange={(event) =>
                  setState({ ...state, rationale: event.target.value })
                }
              />
            </Panel>
          );
        return (
          <Panel eyebrow="Final review" title="Submit your queue decisions">
            <p>
              All incident rankings, actions and your rationale will be
              submitted together. You will receive a submission receipt, not an
              immediate score.
            </p>
          </Panel>
        );
      }}
    />
  );
}

function StageTitle({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Operational queue
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground ">
        {detail}
      </p>
    </div>
  );
}
function Panel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border bg-card p-7  ">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary ">
        {eyebrow}
      </p>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="mt-4 leading-7 text-foreground ">
        {children}
      </div>
    </section>
  );
}

export function PrioritisationModulePage({
  candidateSessionDocumentId,
  slug,
}: {
  candidateSessionDocumentId: string;
  slug: string;
}) {
  const createPracticeState = useCallback(
    (practice: Practice): State => ({
      initial: rowsFor(practice),
      final: [],
      rationale: "",
    }),
    [],
  );
  return (
    <OperationalReadinessPage<Practice, State, Content>
      candidateSessionDocumentId={candidateSessionDocumentId}
      slug={slug}
      createPracticeState={createPracticeState}
      isPracticeComplete={(state) =>
        state.initial.every((row) => row.rank > 0) &&
        new Set(state.initial.map((row) => row.rank)).size ===
          state.initial.length &&
        state.rationale.trim().length >= 10
      }
      renderPractice={(practice, state, setState) => (
        <PracticeWorkspace
          practice={practice}
          state={state}
          setState={setState}
        />
      )}
      renderAssessment={(launch) => <Assessed launch={launch} />}
    />
  );
}
