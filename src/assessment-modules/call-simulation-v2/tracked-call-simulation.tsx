"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Loader2,
  LockKeyhole,
  Maximize2,
  PauseCircle,
  RadioTower,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssessmentRuntimeClient } from "@/lib/assessment-runtime-client";
import type { LaunchEnvelope } from "../types";
import {
  emptyIncidentResponse,
  IncidentWorkspace,
  type IncidentResponse,
} from "./incident-workspace";

type CallContent = { scenarios: import("../types").CallSimulationScenario[] };
type Props = { launch: LaunchEnvelope<CallContent> };
type Receipt = { receiptId: string; status: "received"; submittedAt: string };

function formatRemaining(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  return `${String(minutes).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function responseComplete(response: IncidentResponse) {
  return Boolean(
    response.fields.callerName?.trim() &&
    response.fields.location?.trim() &&
    response.fields.incident?.trim() &&
    response.actionId &&
    response.classification &&
    response.incidentType &&
    response.resourceDecision &&
    response.handover.trim(),
  );
}

export function TrackedCallSimulation({ launch }: Props) {
  const scenarios = launch.content.scenarios;
  const [stageIndex, setStageIndex] = useState(0);
  const [responses, setResponses] = useState<IncidentResponse[]>(() =>
    scenarios.map((scenario) => emptyIncidentResponse(scenario.id)),
  );
  const [revision, setRevision] = useState(launch.progressRevision);
  const [remaining, setRemaining] = useState(() =>
    Math.max(
      0,
      Math.floor((new Date(launch.deadlineAt).getTime() - Date.now()) / 1_000),
    ),
  );
  const [pauseReason, setPauseReason] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [breakActive, setBreakActive] = useState(false);
  const [breakRemaining, setBreakRemaining] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [replacementLaunch, setReplacementLaunch] =
    useState<LaunchEnvelope<CallContent> | null>(null);
  const [restarting, setRestarting] = useState(false);
  const stageStartedAt = useRef(Date.now());
  const lastHeartbeat = useRef(Date.now());
  const activeLoss = useRef<{
    type: "tab_hidden" | "focus_lost" | "fullscreen_exit";
    startedAt: number;
  } | null>(null);

  const stage = launch.stageGraph.nodes[stageIndex];
  const scenarioIndex = stageIndex - 1;
  const currentResponse =
    scenarioIndex >= 0 && scenarioIndex < responses.length
      ? responses[scenarioIndex]
      : null;

  const recordEvent = useCallback(
    async (type: string, durationMs?: number) => {
      try {
        const result = await AssessmentRuntimeClient.event(launch.attemptId, {
          type,
          durationMs,
          occurredAt: new Date().toISOString(),
          stageId: launch.stageGraph.nodes[stageIndex]?.id,
        });
        if (result.status === "interrupted_locked") setLocked(true);
      } catch (eventError) {
        const message =
          eventError instanceof Error
            ? eventError.message
            : "Integrity event could not be recorded";
        if (/locked|interrupted/i.test(message)) setLocked(true);
      }
    },
    [launch.attemptId, launch.stageGraph.nodes, stageIndex],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining(
        Math.max(
          0,
          Math.floor(
            (new Date(launch.deadlineAt).getTime() - Date.now()) / 1_000,
          ),
        ),
      );
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [launch.deadlineAt]);

  useEffect(() => {
    if (!breakActive) return;
    const timer = window.setInterval(
      () =>
        setBreakRemaining((value) => {
          if (value <= 1) {
            window.clearInterval(timer);
            setBreakActive(false);
            return 0;
          }
          return value - 1;
        }),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [breakActive]);

  useEffect(() => {
    if (receipt || locked) return;
    let active = true;
    const heartbeat = async () => {
      try {
        await AssessmentRuntimeClient.heartbeat(launch.attemptId);
        lastHeartbeat.current = Date.now();
      } catch (heartbeatError) {
        if (
          Date.now() - lastHeartbeat.current >=
          launch.integrity.heartbeatLockSeconds * 1_000
        ) {
          setLocked(true);
          setPauseReason(
            "The connection heartbeat was unavailable for 60 seconds.",
          );
          void recordEvent(
            "heartbeat_timeout",
            Date.now() - lastHeartbeat.current,
          );
        } else if (active) {
          setError(
            heartbeatError instanceof Error
              ? heartbeatError.message
              : "Connection check failed",
          );
        }
      }
    };
    void heartbeat();
    const timer = window.setInterval(
      heartbeat,
      launch.integrity.heartbeatIntervalSeconds * 1_000,
    );
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [
    launch.attemptId,
    launch.integrity.heartbeatIntervalSeconds,
    launch.integrity.heartbeatLockSeconds,
    locked,
    receipt,
    recordEvent,
  ]);

  useEffect(() => {
    if (receipt || locked) return;
    const beginLoss = (
      type: "tab_hidden" | "focus_lost" | "fullscreen_exit",
      reason: string,
    ) => {
      if (!activeLoss.current)
        activeLoss.current = { type, startedAt: Date.now() };
      setPauseReason(reason);
    };
    const endLoss = () => {
      const loss = activeLoss.current;
      if (!loss) return;
      activeLoss.current = null;
      void recordEvent(loss.type, Date.now() - loss.startedAt);
    };
    const visibility = () => {
      if (document.hidden)
        beginLoss(
          "tab_hidden",
          "The assessment paused because this tab was hidden.",
        );
      else endLoss();
    };
    const fullscreen = () => {
      if (!document.fullscreenElement)
        beginLoss(
          "fullscreen_exit",
          "The assessment paused because fullscreen ended.",
        );
      else endLoss();
    };
    const blur = () => {
      if (!document.hidden)
        beginLoss(
          "focus_lost",
          "The assessment paused because the window lost focus.",
        );
    };
    const focus = () => {
      if (!document.hidden) endLoss();
    };
    const blockClipboard = (event: ClipboardEvent) => {
      event.preventDefault();
      void recordEvent(`clipboard_${event.type}`);
    };
    const blockContext = (event: MouseEvent) => {
      event.preventDefault();
      void recordEvent("context_menu");
    };
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("fullscreenchange", fullscreen);
    window.addEventListener("blur", blur);
    window.addEventListener("focus", focus);
    if (launch.integrity.blockClipboard) {
      document.addEventListener("copy", blockClipboard);
      document.addEventListener("cut", blockClipboard);
      document.addEventListener("paste", blockClipboard);
    }
    if (launch.integrity.blockContextMenu)
      document.addEventListener("contextmenu", blockContext);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("fullscreenchange", fullscreen);
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", focus);
      document.removeEventListener("copy", blockClipboard);
      document.removeEventListener("cut", blockClipboard);
      document.removeEventListener("paste", blockClipboard);
      document.removeEventListener("contextmenu", blockContext);
    };
  }, [
    launch.integrity.blockClipboard,
    launch.integrity.blockContextMenu,
    locked,
    receipt,
    recordEvent,
  ]);

  const saveProgress = useCallback(
    async (nextStageIndex: number, nextResponses: IncidentResponse[]) => {
      setSaving(true);
      try {
        const saved = await AssessmentRuntimeClient.progress(
          launch.attemptId,
          revision,
          {
            stageIndex: nextStageIndex,
            responses: nextResponses,
          },
        );
        setRevision(saved.progressRevision);
        setError(null);
        return true;
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Progress could not be saved",
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [launch.attemptId, revision],
  );

  const next = useCallback(async () => {
    setError(null);
    let nextResponses = responses;
    if (currentResponse) {
      if (!responseComplete(currentResponse)) {
        setError(
          "Complete the key incident fields, action, classification, response and handover before continuing.",
        );
        return;
      }
      const elapsedSeconds = Math.max(
        1,
        Math.round((Date.now() - stageStartedAt.current) / 1_000),
      );
      nextResponses = responses.map((response, index) =>
        index === scenarioIndex ? { ...response, elapsedSeconds } : response,
      );
      setResponses(nextResponses);
    }
    const nextIndex = stageIndex + 1;
    const saved = await saveProgress(Math.min(nextIndex, 4), nextResponses);
    if (!saved) return;
    if (currentResponse && scenarioIndex < scenarios.length - 1) {
      setBreakRemaining(60);
      setBreakActive(true);
    }
    stageStartedAt.current = Date.now();
    setStageIndex(nextIndex);
  }, [
    currentResponse,
    responses,
    saveProgress,
    scenarioIndex,
    scenarios.length,
    stageIndex,
  ]);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await AssessmentRuntimeClient.submit(
        launch.attemptId,
        crypto.randomUUID(),
        { scenarios: responses },
      );
      setReceipt(result);
      setStageIndex(launch.stageGraph.nodes.length - 1);
      if (document.fullscreenElement)
        await document.exitFullscreen().catch(() => undefined);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Submission was not accepted",
      );
    } finally {
      setSubmitting(false);
    }
  }, [launch.attemptId, launch.stageGraph.nodes.length, responses]);

  const resume = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        return;
      }
    }
    setPauseReason(null);
  }, []);

  const restart = useCallback(async () => {
    setRestarting(true);
    setError(null);
    try {
      if (!document.fullscreenElement)
        await document.documentElement.requestFullscreen();
      const nextLaunch = await AssessmentRuntimeClient.restart<CallContent>(
        launch.attemptId,
        crypto.randomUUID(),
      );
      setReplacementLaunch(nextLaunch);
    } catch (restartError) {
      setError(
        restartError instanceof Error
          ? restartError.message
          : "A fresh attempt could not be created",
      );
    } finally {
      setRestarting(false);
    }
  }, [launch.attemptId]);

  const completedCount = useMemo(
    () => responses.filter(responseComplete).length,
    [responses],
  );

  if (replacementLaunch)
    return <TrackedCallSimulation launch={replacementLaunch} />;

  return (
    <main className="min-h-screen bg-muted text-foreground  ">
      <header className="border-b border-border bg-background text-foreground">
        <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              CTRL incident desk
            </p>
            <p className="font-semibold">Call Simulation v2</p>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <span className="hidden items-center gap-2 text-primary sm:flex">
              <RadioTower className="h-4 w-4" aria-hidden="true" /> Monitored
            </span>
            <span
              className="flex min-w-24 items-center justify-end gap-2 font-mono text-base"
              aria-label={`${remaining} seconds remaining`}
            >
              <Clock3 className="h-4 w-4" aria-hidden="true" />
              {formatRemaining(remaining)}
            </span>
          </div>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav
          className="border-r border-border bg-card p-5  "
          aria-label="Assessment stages"
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Stage ledger
          </p>
          <ol className="space-y-1">
            {launch.stageGraph.nodes.map((node, index) => {
              const active = index === stageIndex;
              const complete = index < stageIndex;
              return (
                <li
                  key={node.id}
                  className={`border-l-4 px-3 py-3 ${active ? "border-primary bg-primary/10  " : complete ? "border-primary" : "border-border "}`}
                  aria-current={active ? "step" : undefined}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center border border-current text-[10px] font-bold">
                      {complete ? (
                        <Check className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-semibold leading-5">
                        {node.title}
                      </p>
                      <p className="text-xs text-muted-foreground ">
                        {node.assessed ? "Assessed" : "Receipt"}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="mt-6 border-t border-border pt-4 text-xs leading-5 text-muted-foreground  ">
            Release {launch.module.releaseVersion}
            <br />
            Attempt {launch.attemptId.slice(0, 8)}
          </div>
        </nav>

        <div className="min-w-0 p-4 sm:p-7">
          <div className="mx-auto max-w-5xl">
            {error ? (
              <div
                role="alert"
                className="mb-5 flex gap-3 border-l-4 border-destructive bg-destructive/10 p-4 text-sm text-foreground  "
              >
                <AlertTriangle
                  className="h-5 w-5 shrink-0"
                  aria-hidden="true"
                />
                {error}
              </div>
            ) : null}

            {stageIndex === 0 ? (
              <section
                className="border border-border bg-card p-7  "
                aria-labelledby="tracked-briefing-title"
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-foreground ">
                  Monitoring active
                </p>
                <h1
                  id="tracked-briefing-title"
                  className="text-2xl font-semibold tracking-tight"
                >
                  Assessed section briefing
                </h1>
                <p className="mt-4 max-w-3xl leading-7 text-foreground ">
                  You will handle three incidents. Caller audio remains
                  available within each incident. Capture information as it
                  arrives, choose one follow-up, classify risk, decide the
                  response and produce a concise handover.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {[
                    "Three different risk categories",
                    "Progress saved between incidents",
                    "No score shown after submission",
                  ].map((item) => (
                    <div
                      key={item}
                      className="border border-border p-4 text-sm font-medium "
                    >
                      {item}
                    </div>
                  ))}
                </div>
                <Button
                  className="mt-7 min-h-11 rounded-none bg-primary px-6 text-primary-foreground hover:bg-primary/90"
                  onClick={next}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{" "}
                  Open first incident
                </Button>
              </section>
            ) : null}

            {currentResponse && scenarios[scenarioIndex] ? (
              <>
                <IncidentWorkspace
                  scenario={scenarios[scenarioIndex]}
                  media={launch.media}
                  value={currentResponse}
                  onChange={(value) =>
                    setResponses((current) =>
                      current.map((response, index) =>
                        index === scenarioIndex ? value : response,
                      ),
                    )
                  }
                />
                <div className="mt-6 flex justify-end">
                  <Button
                    className="min-h-11 rounded-none bg-primary px-6 text-primary-foreground hover:bg-primary/90"
                    onClick={next}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    {scenarioIndex === scenarios.length - 1
                      ? "Review responses"
                      : "Save and continue"}
                  </Button>
                </div>
              </>
            ) : null}

            {stageIndex === 4 ? (
              <section
                className="border border-border bg-card p-7  "
                aria-labelledby="review-title"
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Final review
                </p>
                <h1 id="review-title" className="text-2xl font-semibold">
                  Submit your incident records
                </h1>
                <p className="mt-3 leading-7 text-foreground ">
                  All {completedCount} incident records are complete. Submission
                  is final. Your hiring team receives the scored evidence after
                  processing; this screen will only show a receipt.
                </p>
                <ul className="mt-6 divide-y divide-border border-y border-border  ">
                  {scenarios.map((scenario, index) => (
                    <li
                      key={scenario.id}
                      className="flex items-center justify-between gap-4 py-4"
                    >
                      <span className="font-medium">{scenario.title}</span>
                      <span className="flex items-center gap-2 text-sm text-primary ">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        Complete
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-7 min-h-12 rounded-none bg-primary px-7 text-primary-foreground hover:bg-primary/90"
                  onClick={submit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <FileCheck2 className="h-4 w-4" aria-hidden="true" />
                  )}{" "}
                  Submit assessment
                </Button>
              </section>
            ) : null}

            {receipt ? (
              <section
                className="border border-border bg-card p-8 text-center  "
                aria-labelledby="receipt-title"
              >
                <CheckCircle2
                  className="mx-auto h-10 w-10 text-primary "
                  aria-hidden="true"
                />
                <h1 id="receipt-title" className="mt-4 text-2xl font-semibold">
                  Assessment received
                </h1>
                <p className="mx-auto mt-3 max-w-xl leading-7 text-muted-foreground ">
                  Your responses have been submitted for scoring and review. No
                  result is shown here. Follow the next steps provided by the
                  hiring team.
                </p>
                <dl className="mx-auto mt-6 grid max-w-xl gap-3 border border-border p-4 text-left text-sm  sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Receipt</dt>
                    <dd className="font-mono">{receipt.receiptId}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Received</dt>
                    <dd>
                      {new Date(receipt.submittedAt).toLocaleString("en-GB")}
                    </dd>
                  </div>
                </dl>
                <Button
                  className="mt-7 rounded-none"
                  onClick={() => {
                    window.location.href = "/candidate/dashboard";
                  }}
                >
                  Return to candidate portal
                </Button>
              </section>
            ) : null}
          </div>
        </div>
      </div>

      {breakActive && !locked ? (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-background/90 p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="break-title"
        >
          <div className="w-full max-w-lg border border-border bg-card p-7 text-card-foreground shadow-2xl">
            <PauseCircle
              className="h-8 w-8 text-amber-300"
              aria-hidden="true"
            />
            <h2 id="break-title" className="mt-4 text-xl font-semibold">
              Controlled break between incidents
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              Monitoring remains active. The next incident is not visible yet.
              Continue when ready or use the remaining {breakRemaining} seconds.
            </p>
            <Button
              className="mt-6 rounded-none bg-card text-foreground hover:bg-muted"
              onClick={() => setBreakActive(false)}
            >
              Continue to next incident
            </Button>
          </div>
        </div>
      ) : null}

      {pauseReason && !locked ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background p-5"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="pause-title"
        >
          <div className="w-full max-w-lg border border-warning bg-card p-7 text-card-foreground">
            <AlertTriangle
              className="h-8 w-8 text-amber-300"
              aria-hidden="true"
            />
            <h2 id="pause-title" className="mt-4 text-xl font-semibold">
              Assessment paused
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              {pauseReason} Repeated or prolonged interruptions lock the
              attempt.
            </p>
            <Button
              className="mt-6 rounded-none bg-card text-foreground hover:bg-muted"
              onClick={resume}
            >
              <Maximize2 className="h-4 w-4" aria-hidden="true" /> Return to
              fullscreen and resume
            </Button>
          </div>
        </div>
      ) : null}

      {locked ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background p-5"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="locked-title"
        >
          <div className="w-full max-w-lg border border-destructive bg-card p-7 text-card-foreground">
            <LockKeyhole className="h-8 w-8 text-red-300" aria-hidden="true" />
            <h2 id="locked-title" className="mt-4 text-xl font-semibold">
              Attempt interrupted and locked
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              The assessed workspace is no longer available. Restarting voids
              this exposed attempt and selects a fresh scenario set.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Receipt reference: {launch.attemptId}
            </p>
            <Button
              className="mt-6 rounded-none bg-card text-foreground hover:bg-muted"
              disabled={restarting}
              onClick={restart}
            >
              {restarting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}{" "}
              Restart with fresh incidents
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
