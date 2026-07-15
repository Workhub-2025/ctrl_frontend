"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Loader2,
  LockKeyhole,
  Maximize2,
  RadioTower,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssessmentRuntimeClient } from "@/lib/assessment-runtime-client";
import type { LaunchEnvelope } from "../types";

type Receipt = { receiptId: string; status: "received"; submittedAt: string };
type StageContext<TState> = {
  stageIndex: number;
  state: TState;
  setState: (next: TState) => void;
};

type Props<TContent, TState> = {
  launch: LaunchEnvelope<TContent>;
  title: string;
  initialState: (content: TContent) => TState;
  validateStage: (stageIndex: number, state: TState) => string | null;
  buildSubmission: (state: TState, elapsedSeconds: number) => unknown;
  renderStage: (context: StageContext<TState>, content: TContent) => ReactNode;
  restartNoun: string;
};

function formatRemaining(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function TrackedAssessmentShell<TContent, TState>(
  props: Props<TContent, TState>,
) {
  const {
    launch,
    title,
    initialState,
    validateStage,
    buildSubmission,
    renderStage,
    restartNoun,
  } = props;
  const [stageIndex, setStageIndex] = useState(0);
  const [state, setState] = useState<TState>(() =>
    initialState(launch.content),
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
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [replacementLaunch, setReplacementLaunch] =
    useState<LaunchEnvelope<TContent> | null>(null);
  const startedAt = useRef(Date.now());
  const lastHeartbeat = useRef(Date.now());
  const activeLoss = useRef<{
    type: "tab_hidden" | "focus_lost" | "fullscreen_exit";
    startedAt: number;
    timer?: number;
  } | null>(null);

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
        if (
          /locked|interrupted/i.test(
            eventError instanceof Error ? eventError.message : "",
          )
        )
          setLocked(true);
      }
    },
    [launch.attemptId, launch.stageGraph.nodes, stageIndex],
  );

  useEffect(() => {
    const timer = window.setInterval(
      () =>
        setRemaining(
          Math.max(
            0,
            Math.floor(
              (new Date(launch.deadlineAt).getTime() - Date.now()) / 1_000,
            ),
          ),
        ),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [launch.deadlineAt]);

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
        } else if (active)
          setError(
            heartbeatError instanceof Error
              ? heartbeatError.message
              : "Connection check failed",
          );
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
    const endLoss = () => {
      const loss = activeLoss.current;
      if (!loss) return;
      if (loss.timer) window.clearTimeout(loss.timer);
      activeLoss.current = null;
      void recordEvent(loss.type, Date.now() - loss.startedAt);
    };
    const beginLoss = (
      type: "tab_hidden" | "focus_lost" | "fullscreen_exit",
      reason: string,
    ) => {
      if (!activeLoss.current) {
        const loss = {
          type,
          startedAt: Date.now(),
          timer: undefined as number | undefined,
        };
        loss.timer = window.setTimeout(
          () =>
            void recordEvent(
              type,
              launch.integrity.focusLossLockSeconds * 1_000 + 1,
            ),
          launch.integrity.focusLossLockSeconds * 1_000,
        );
        activeLoss.current = loss;
      }
      setPauseReason(reason);
    };
    const visibility = () =>
      document.hidden
        ? beginLoss(
            "tab_hidden",
            "The assessment paused because this tab was hidden.",
          )
        : endLoss();
    const fullscreen = () =>
      document.fullscreenElement
        ? endLoss()
        : beginLoss(
            "fullscreen_exit",
            "The assessment paused because fullscreen ended.",
          );
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
      if (activeLoss.current?.timer)
        window.clearTimeout(activeLoss.current.timer);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("fullscreenchange", fullscreen);
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", focus);
      document.removeEventListener("copy", blockClipboard);
      document.removeEventListener("cut", blockClipboard);
      document.removeEventListener("paste", blockClipboard);
      document.removeEventListener("contextmenu", blockContext);
    };
  }, [launch.integrity, locked, receipt, recordEvent]);

  const next = useCallback(async () => {
    const validationError = validateStage(stageIndex, state);
    if (validationError) {
      setError(validationError);
      return;
    }
    const nextIndex = stageIndex + 1;
    setSaving(true);
    try {
      const saved = await AssessmentRuntimeClient.progress(
        launch.attemptId,
        revision,
        { stageIndex: nextIndex, state },
      );
      setRevision(saved.progressRevision);
      setStageIndex(nextIndex);
      setError(null);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Progress could not be saved",
      );
    } finally {
      setSaving(false);
    }
  }, [launch.attemptId, revision, stageIndex, state, validateStage]);

  const submit = useCallback(async () => {
    const validationError = validateStage(stageIndex, state);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      const elapsedSeconds = Math.max(
        1,
        Math.round((Date.now() - startedAt.current) / 1_000),
      );
      setReceipt(
        await AssessmentRuntimeClient.submit(
          launch.attemptId,
          crypto.randomUUID(),
          buildSubmission(state, elapsedSeconds),
        ),
      );
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
  }, [
    buildSubmission,
    launch.attemptId,
    launch.stageGraph.nodes.length,
    stageIndex,
    state,
    validateStage,
  ]);

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
    try {
      if (!document.fullscreenElement)
        await document.documentElement.requestFullscreen();
      setReplacementLaunch(
        await AssessmentRuntimeClient.restart<TContent>(
          launch.attemptId,
          crypto.randomUUID(),
        ),
      );
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

  if (replacementLaunch)
    return <TrackedAssessmentShell {...props} launch={replacementLaunch} />;

  const reviewIndex = launch.stageGraph.nodes.length - 2;
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-white">
      <header className="border-b border-slate-700 bg-slate-950 text-white">
        <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              CTRL operational simulation
            </p>
            <p className="font-semibold">{title}</p>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <span className="hidden items-center gap-2 text-emerald-300 sm:flex">
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
          className="border-r border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
          aria-label="Assessment stages"
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Stage ledger
          </p>
          <ol className="space-y-1">
            {launch.stageGraph.nodes.map((node, index) => {
              const active = index === stageIndex;
              const complete = index < stageIndex;
              return (
                <li
                  key={node.id}
                  className={`border-l-4 px-3 py-3 ${active ? "border-blue-800 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40" : complete ? "border-emerald-700" : "border-slate-200 dark:border-slate-700"}`}
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
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {node.assessed ? "Assessed" : "Receipt"}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="mt-6 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500 dark:border-slate-700 dark:text-slate-400">
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
                className="mb-5 flex gap-3 border-l-4 border-red-700 bg-red-50 p-4 text-sm text-red-950 dark:bg-red-950/40 dark:text-red-100"
              >
                <AlertTriangle
                  className="h-5 w-5 shrink-0"
                  aria-hidden="true"
                />
                {error}
              </div>
            ) : null}
            {receipt ? (
              <section
                className="border border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900"
                aria-labelledby="receipt-title"
              >
                <CheckCircle2
                  className="mx-auto h-10 w-10 text-emerald-700"
                  aria-hidden="true"
                />
                <h1 id="receipt-title" className="mt-4 text-2xl font-semibold">
                  Assessment received
                </h1>
                <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600 dark:text-slate-300">
                  Your responses have been submitted for scoring and review. No
                  result is shown here.
                </p>
                <dl className="mx-auto mt-6 grid max-w-xl gap-3 border border-slate-300 p-4 text-left text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">Receipt</dt>
                    <dd className="font-mono">{receipt.receiptId}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Received</dt>
                    <dd>
                      {new Date(receipt.submittedAt).toLocaleString("en-GB")}
                    </dd>
                  </div>
                </dl>
                <Button
                  className="mt-7 rounded-none"
                  onClick={() => {
                    window.location.href = "/candidate-dashboard";
                  }}
                >
                  Return to candidate portal
                </Button>
              </section>
            ) : (
              <>
                {renderStage({ stageIndex, state, setState }, launch.content)}
                <div className="mt-6 flex justify-end">
                  {stageIndex < reviewIndex ? (
                    <Button
                      className="min-h-11 rounded-none bg-slate-950 px-6 text-white dark:bg-white dark:text-slate-950"
                      onClick={next}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : null}{" "}
                      Save and continue
                    </Button>
                  ) : stageIndex === reviewIndex ? (
                    <Button
                      className="min-h-12 rounded-none bg-slate-950 px-7 text-white dark:bg-white dark:text-slate-950"
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
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {pauseReason && !locked ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950 p-5"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="pause-title"
        >
          <div className="w-full max-w-lg border border-amber-500 bg-slate-900 p-7 text-white">
            <AlertTriangle
              className="h-8 w-8 text-amber-300"
              aria-hidden="true"
            />
            <h2 id="pause-title" className="mt-4 text-xl font-semibold">
              Assessment paused
            </h2>
            <p className="mt-3 leading-7 text-slate-300">
              {pauseReason} Repeated or prolonged interruptions lock the
              attempt.
            </p>
            <Button
              className="mt-6 rounded-none bg-white text-slate-950"
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
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950 p-5"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="locked-title"
        >
          <div className="w-full max-w-lg border border-red-500 bg-slate-900 p-7 text-white">
            <LockKeyhole className="h-8 w-8 text-red-300" aria-hidden="true" />
            <h2 id="locked-title" className="mt-4 text-xl font-semibold">
              Attempt interrupted and locked
            </h2>
            <p className="mt-3 leading-7 text-slate-300">
              Restarting voids this exposed attempt and selects fresh{" "}
              {restartNoun}.
            </p>
            <Button
              className="mt-6 rounded-none bg-white text-slate-950"
              disabled={restarting}
              onClick={restart}
            >
              {restarting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}{" "}
              Restart assessment
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
