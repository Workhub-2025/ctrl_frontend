"use client";

import { useId } from "react";
import { AlertTriangle, CheckCircle2, Headphones, Radio } from "lucide-react";
import type { CallSimulationScenario, MediaReference } from "../types";

export type IncidentResponse = {
  scenarioId: string;
  fields: Record<string, string>;
  actionId: string;
  classification: string;
  incidentType: string;
  resourceDecision: string;
  handover: string;
  elapsedSeconds: number;
};

export function emptyIncidentResponse(scenarioId: string): IncidentResponse {
  return {
    scenarioId,
    fields: {},
    actionId: "",
    classification: "",
    incidentType: "",
    resourceDecision: "",
    handover: "",
    elapsedSeconds: 0,
  };
}

type Props = {
  scenario: CallSimulationScenario;
  media: Record<string, MediaReference>;
  value: IncidentResponse;
  onChange: (value: IncidentResponse) => void;
  practice?: boolean;
};

export function IncidentWorkspace({
  scenario,
  media,
  value,
  onChange,
  practice = false,
}: Props) {
  const id = useId();
  const selectedAction = scenario.actions.find(
    (action) => action.id === value.actionId,
  );
  const update = (patch: Partial<IncidentResponse>) =>
    onChange({ ...value, ...patch });
  const updateField = (fieldId: string, fieldValue: string) =>
    update({
      fields: { ...value.fields, [fieldId]: fieldValue },
    });

  return (
    <div className="space-y-6">
      <section
        className="border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        aria-labelledby={`${id}-call-title`}
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
          <div>
            <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">
              <Radio className="h-4 w-4" aria-hidden="true" />{" "}
              {practice ? "Training channel" : "Live incident"}
            </p>
            <h2
              id={`${id}-call-title`}
              className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white"
            >
              {scenario.title}
            </h2>
          </div>
          <span className="border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
            {practice ? "Not scored or monitored" : "Assessed"}
          </span>
        </div>
        <p className="mb-4 text-sm leading-6 text-slate-700 dark:text-slate-200">
          {scenario.dispatchContext}
        </p>
        <label
          className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"
          htmlFor={`${id}-base-audio`}
        >
          <Headphones className="h-4 w-4" aria-hidden="true" /> Caller audio
        </label>
        <audio
          id={`${id}-base-audio`}
          className="w-full"
          controls
          preload="metadata"
          src={media[scenario.baseMediaId]?.url}
        >
          Your browser does not support audio playback.
        </audio>
        {scenario.transcripts?.[scenario.baseMediaId] ? (
          <details className="mt-3 border-l-4 border-slate-400 bg-slate-50 p-3 text-sm dark:border-slate-500 dark:bg-slate-800">
            <summary className="cursor-pointer font-semibold">
              Approved audio transcript
            </summary>
            <p className="mt-2 leading-6">
              {scenario.transcripts[scenario.baseMediaId]}
            </p>
          </details>
        ) : null}
      </section>

      <section
        className="border border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
        aria-labelledby={`${id}-capture-title`}
      >
        <h3
          id={`${id}-capture-title`}
          className="mb-1 text-base font-semibold text-slate-950 dark:text-white"
        >
          Incident record
        </h3>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          Capture details while audio is available. Use concise operational
          language.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {scenario.captureFields.map((field) => (
            <div key={field.id}>
              <label
                className="mb-1.5 block text-sm font-medium text-slate-800 dark:text-slate-100"
                htmlFor={`${id}-${field.id}`}
              >
                {field.label}
              </label>
              <input
                id={`${id}-${field.id}`}
                type={field.inputMode === "tel" ? "tel" : "text"}
                value={value.fields[field.id] ?? ""}
                onChange={(event) => updateField(field.id, event.target.value)}
                className="min-h-11 w-full border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus-visible:border-blue-700 focus-visible:ring-2 focus-visible:ring-blue-700/30 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                autoComplete="off"
              />
            </div>
          ))}
        </div>
      </section>

      <fieldset className="border border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <legend className="px-1 text-base font-semibold text-slate-950 dark:text-white">
          Follow-up action
        </legend>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          {scenario.actionPrompt}
        </p>
        <div className="space-y-2">
          {scenario.actions.map((action) => (
            <label
              key={action.id}
              className="flex min-h-12 cursor-pointer items-start gap-3 border border-slate-300 p-3 hover:border-slate-500 has-[:checked]:border-blue-800 has-[:checked]:bg-blue-50 dark:border-slate-700 dark:has-[:checked]:border-blue-400 dark:has-[:checked]:bg-blue-950/40"
            >
              <input
                type="radio"
                name={`${id}-action`}
                value={action.id}
                checked={value.actionId === action.id}
                onChange={() => update({ actionId: action.id })}
                className="mt-1 h-4 w-4"
              />
              <span className="text-sm font-medium leading-6">
                {action.label}
              </span>
            </label>
          ))}
        </div>
        {selectedAction ? (
          <div
            className="mt-4 border-l-4 border-amber-500 bg-amber-50 p-4 dark:bg-amber-950/30"
            aria-live="polite"
          >
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Caller
              response
            </p>
            <audio
              controls
              preload="metadata"
              className="w-full"
              src={media[selectedAction.branchMediaId]?.url}
            >
              Your browser does not support audio playback.
            </audio>
            <p className="mt-2 text-sm leading-6">
              {selectedAction.branchSummary}
            </p>
            {scenario.transcripts?.[selectedAction.branchMediaId] ? (
              <p className="mt-2 text-sm">
                <strong>Transcript:</strong>{" "}
                {scenario.transcripts[selectedAction.branchMediaId]}
              </p>
            ) : null}
          </div>
        ) : null}
      </fieldset>

      <section
        className="grid gap-4 border border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-3"
        aria-labelledby={`${id}-decision-title`}
      >
        <h3
          id={`${id}-decision-title`}
          className="md:col-span-3 text-base font-semibold"
        >
          Operational decision
        </h3>
        {[
          [
            "Risk classification",
            "classification",
            scenario.classificationOptions,
          ],
          ["Incident type", "incidentType", scenario.incidentTypeOptions],
          [
            "Response and resource",
            "resourceDecision",
            scenario.resourceOptions,
          ],
        ].map(([label, key, options]) => (
          <div key={key as string}>
            <label
              className="mb-1.5 block text-sm font-medium"
              htmlFor={`${id}-${key}`}
            >
              {label as string}
            </label>
            <select
              id={`${id}-${key}`}
              className="min-h-11 w-full border border-slate-400 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:border-slate-600 dark:bg-slate-950"
              value={
                value[
                  key as "classification" | "incidentType" | "resourceDecision"
                ]
              }
              onChange={(event) =>
                update({ [key as string]: event.target.value })
              }
            >
              <option value="">Select an option</option>
              {(options as string[]).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ))}
      </section>

      <section
        className="border border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
        aria-labelledby={`${id}-handover-title`}
      >
        <h3
          id={`${id}-handover-title`}
          className="mb-1 text-base font-semibold"
        >
          Handover record
        </h3>
        <label
          className="mb-2 block text-sm text-slate-600 dark:text-slate-300"
          htmlFor={`${id}-handover`}
        >
          Summarise what is happening, where, who is at risk, key intelligence
          and the response required.
        </label>
        <textarea
          id={`${id}-handover`}
          rows={5}
          value={value.handover}
          onChange={(event) => update({ handover: event.target.value })}
          className="w-full border border-slate-400 bg-white p-3 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:border-slate-600 dark:bg-slate-950"
        />
        {practice &&
        value.actionId &&
        value.classification &&
        value.incidentType &&
        value.resourceDecision &&
        value.handover.trim() ? (
          <p
            className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300"
            role="status"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Practice
            record complete
          </p>
        ) : null}
      </section>
    </div>
  );
}
