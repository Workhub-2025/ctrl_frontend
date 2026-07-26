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
  CheckCircle2,
  Clock3,
  FileCheck2,
  Loader2,
  LockKeyhole,
  Maximize2,
  RadioTower,
} from "lucide-react";
import { AccessibilityDropdown } from "@/components/accessibility/accessibility-dropdown";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import {
  assessmentTimerAnnouncement,
  restoreAssessmentProgress,
} from "@/lib/assessment-accessibility";
import { notifyAssessmentCompleted } from "@/lib/assessment-completion";
import { AssessmentRuntimeClient } from "@/lib/assessment-runtime-client";
import { CandidateSessionService } from "@/services/candidate-session.service";
import type { LaunchEnvelope } from "../types";

type Receipt = { receiptId: string; status: "received"; submittedAt: string };
type StageContext<TState> = {
  stageIndex: number;
  state: TState;
  setState: (next: TState) => void;
  advance: (nextState?: TState) => Promise<void>;
  isSaving: boolean;
};

type Props<TContent, TState> = {
  launch: LaunchEnvelope<TContent>;
  title: string;
  initialState: (content: TContent) => TState;
  validateStage: (stageIndex: number, state: TState) => string | null;
  buildSubmission: (state: TState, elapsedSeconds: number) => unknown;
  renderStage: (context: StageContext<TState>, content: TContent) => ReactNode;
  restartNoun: string;
  canManuallyAdvance?: (stageIndex: number) => boolean;
  continueLabel?: (stageIndex: number) => string;
};

function formatRemaining(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function IntegrityAlert({
  open,
  tone,
  title,
  description,
  actionLabel,
  actionIcon,
  actionDisabled,
  onAction,
}: {
  open: boolean;
  tone: "warning" | "destructive";
  title: string;
  description: ReactNode;
  actionLabel: string;
  actionIcon: ReactNode;
  actionDisabled?: boolean;
  onAction: () => void;
}) {
  const actionRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        className={`rounded-none ${
          tone === "warning"
            ? "border-warning/60"
            : "border-destructive/60"
        }`}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          previousFocus.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
          actionRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (previousFocus.current?.isConnected) previousFocus.current.focus();
        }}
      >
        {tone === "warning" ? (
          <AlertTriangle
            className="h-8 w-8 text-amber-300"
            aria-hidden="true"
          />
        ) : (
          <LockKeyhole className="h-8 w-8 text-red-300" aria-hidden="true" />
        )}
        <AlertDialogTitle className="text-xl">{title}</AlertDialogTitle>
        <AlertDialogDescription className="leading-7">
          {description}
        </AlertDialogDescription>
        <AlertDialogAction
          ref={actionRef}
          className="mt-2 rounded-sm"
          disabled={actionDisabled}
          onClick={onAction}
        >
          {actionIcon}
          {actionLabel}
        </AlertDialogAction>
      </AlertDialogContent>
    </AlertDialog>
  );
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
    canManuallyAdvance = () => true,
    continueLabel = () => "Save and continue",
  } = props;
  const [restoredProgress] = useState(() =>
    restoreAssessmentProgress(
      launch.progressData,
      initialState(launch.content),
      launch.stageGraph.nodes.length,
    ),
  );
  const [stageIndex, setStageIndex] = useState(restoredProgress.stageIndex);
  const [state, setState] = useState<TState>(restoredProgress.state);
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
  const [timerAnnouncement, setTimerAnnouncement] = useState("");
  const startedAt = useRef(Date.now());
  const lastHeartbeat = useRef(Date.now());
  const previousRemaining = useRef<number | null>(null);
  const activeLoss = useRef<{
    type: "tab_hidden" | "focus_lost" | "fullscreen_exit";
    startedAt: number;
    timer?: number;
  } | null>(null);
  const {
    settings: accessibilitySettings,
    updateSettings: updateAccessibilitySettings,
    resetSettings: resetAccessibilitySettings,
  } = useAccessibilitySettings({ enabled: true });

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
    const announcement = assessmentTimerAnnouncement(
      previousRemaining.current,
      remaining,
    );
    previousRemaining.current = remaining;
    if (announcement) setTimerAnnouncement(announcement);
  }, [remaining]);

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
    const endLoss = (
      type: "tab_hidden" | "fullscreen_exit",
    ) => {
      const loss = activeLoss.current;
      if (!loss || loss.type !== type) return;
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
        : endLoss("tab_hidden");
    const fullscreen = () =>
      document.fullscreenElement
        ? endLoss("fullscreen_exit")
        : beginLoss(
            "fullscreen_exit",
            "The assessment paused because fullscreen ended.",
          );
    const blockClipboard = (event: ClipboardEvent) => {
      event.preventDefault();
      void recordEvent(`clipboard_${event.type}`);
    };
    const blockContext = (event: MouseEvent) => {
      event.preventDefault();
      void recordEvent("context_menu");
    };
    if (launch.integrity.pauseOnHidden)
      document.addEventListener("visibilitychange", visibility);
    if (launch.integrity.pauseOnFullscreenExit)
      document.addEventListener("fullscreenchange", fullscreen);
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
      document.removeEventListener("copy", blockClipboard);
      document.removeEventListener("cut", blockClipboard);
      document.removeEventListener("paste", blockClipboard);
      document.removeEventListener("contextmenu", blockContext);
    };
  }, [launch.integrity, locked, receipt, recordEvent]);

  const next = useCallback(async (nextState?: TState) => {
    const stateToSave = nextState ?? state;
    const validationError = validateStage(stageIndex, stateToSave);
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
        { stageIndex: nextIndex, state: stateToSave },
      );
      setRevision(saved.progressRevision);
      setStageIndex(nextIndex);
      setError(null);
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Progress could not be saved";
      if (/revision conflict/i.test(message)) {
        try {
          const resumed = await AssessmentRuntimeClient.resume(launch.attemptId);
          const resumedProgress = resumed.progressData as
            | { stageIndex?: number; state?: TState }
            | null;
          setRevision(resumed.progressRevision);
          if (typeof resumedProgress?.stageIndex === "number") {
            setStageIndex(resumedProgress.stageIndex);
          }
          if (resumedProgress?.state) {
            setState(resumedProgress.state);
          }
          setError(
            "Your progress was updated elsewhere. Reloaded the latest version — continue from here.",
          );
        } catch {
          setError(message);
        }
      } else {
        setError(message);
      }
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
      CandidateSessionService.invalidateApplications();
      notifyAssessmentCompleted(launch.module.slug ?? title);
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
    if (document.fullscreenEnabled && !document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => undefined);
    }
    setPauseReason(null);
  }, []);

  const restart = useCallback(async () => {
    setRestarting(true);
    try {
      if (document.fullscreenEnabled && !document.fullscreenElement)
        await document.documentElement.requestFullscreen().catch(() => undefined);
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
  const currentNode = launch.stageGraph.nodes[stageIndex];
  const visibleStageCount = reviewIndex + 1;
  const stageProgress = Math.min(100, ((stageIndex + 1) / visibleStageCount) * 100);
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-muted-foreground">{title}</p>
            <p className="truncate text-sm font-semibold">{currentNode?.title ?? "Assessment"}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-sm sm:gap-5">
            <span className="hidden items-center gap-2 text-muted-foreground sm:flex">
              <RadioTower className="h-4 w-4 text-primary" aria-hidden="true" /> Monitored
            </span>
            <span
              className="flex min-w-24 items-center justify-end gap-2 font-mono text-base font-semibold tabular-nums"
              aria-label={`${remaining} seconds remaining`}
            >
              <Clock3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {formatRemaining(remaining)}
            </span>
            <AccessibilityDropdown
              settings={accessibilitySettings}
              updateSettings={updateAccessibilitySettings}
              resetSettings={resetAccessibilitySettings}
              description="Adjust the assessment display and reading preferences."
            />
            <span className="sr-only" aria-live="polite" aria-atomic="true">
              {timerAnnouncement}
            </span>
          </div>
        </div>
        <div className="border-t border-border bg-background">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
            <p className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
              Step {Math.min(stageIndex + 1, visibleStageCount)} of {visibleStageCount}
            </p>
            <div
              className="h-1.5 flex-1 overflow-hidden bg-muted"
              role="progressbar"
              aria-label="Assessment progress"
              aria-valuemin={1}
              aria-valuemax={visibleStageCount}
              aria-valuenow={Math.min(stageIndex + 1, visibleStageCount)}
            >
              <div className="h-full bg-primary transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${stageProgress}%` }} />
            </div>
            <p className="hidden shrink-0 text-xs text-muted-foreground md:block">
              Release {launch.module.releaseVersion} · Attempt {launch.attemptId.slice(0, 8)}
            </p>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7">
        <div className="mx-auto max-w-6xl">
            {error ? (
              <div
                role="alert"
                className="mb-5 flex gap-3 border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground"
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
                className="border border-border bg-card p-8 text-center"
                aria-labelledby="receipt-title"
              >
                <CheckCircle2
                  className="mx-auto h-10 w-10 text-primary"
                  aria-hidden="true"
                />
                <h1 id="receipt-title" className="mt-4 text-2xl font-semibold">
                  Assessment received
                </h1>
                <p className="mx-auto mt-3 max-w-xl leading-7 text-muted-foreground ">
                  Your responses have been submitted for scoring and review. No
                  result is shown here.
                </p>
                <dl className="mx-auto mt-6 grid max-w-xl gap-3 border border-border p-4 text-left text-sm sm:grid-cols-2">
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
                  className="mt-7 rounded-sm"
                  onClick={() => {
                    window.location.href = "/candidate-dashboard";
                  }}
                >
                  Return to candidate portal
                </Button>
              </section>
            ) : (
              <>
                {renderStage({ stageIndex, state, setState, advance: next, isSaving: saving }, launch.content)}
                <div className="sticky bottom-0 z-20 mt-6 flex min-h-16 items-center justify-between gap-4 border border-border bg-card px-4 py-3">
                  <p className="hidden text-xs text-muted-foreground sm:block">
                    Progress is saved before the next step opens.
                  </p>
                  {stageIndex < reviewIndex && canManuallyAdvance(stageIndex) ? (
                    <Button
                      className="ml-auto min-h-11 rounded-sm px-6"
                      onClick={() => void next()}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : null}{" "}
                      {continueLabel(stageIndex)}
                    </Button>
                  ) : stageIndex === reviewIndex ? (
                    <Button
                      className="ml-auto min-h-12 rounded-sm px-7"
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
                  ) : <span className="ml-auto text-xs text-muted-foreground">This step advances automatically.</span>}
                </div>
              </>
            )}
        </div>
      </div>
      <IntegrityAlert
        open={Boolean(pauseReason) && !locked}
        tone="warning"
        title="Assessment paused"
        description={
          <>
            {pauseReason} Repeated or prolonged interruptions lock the attempt.
            Fullscreen is restored when the browser and your access technology
            support it.
          </>
        }
        actionLabel="Resume assessment"
        actionIcon={<Maximize2 className="h-4 w-4" aria-hidden="true" />}
        onAction={() => void resume()}
      />
      <IntegrityAlert
        open={locked}
        tone="destructive"
        title="Attempt interrupted and locked"
        description={
          <>
            Restarting voids this exposed attempt and selects fresh{" "}
            {restartNoun}.
          </>
        }
        actionLabel="Restart assessment"
        actionIcon={
          restarting ? (
            <Loader2
              className="h-4 w-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          )
        }
        actionDisabled={restarting}
        onAction={() => void restart()}
      />
    </main>
  );
}
