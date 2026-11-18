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
  HelpCircle,
  Loader2,
  LockKeyhole,
  LogOut,
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
import {
  AssessmentRuntimeClient,
  closedAttemptReason,
  type PageVisibility,
} from "@/lib/assessment-runtime-client";
import { CandidateSessionService } from "@/services/candidate-session.service";
import type { LaunchEnvelope } from "../types";
import { StageTimerContext, formatClock, type StageTimer } from "./stage-timer";

type Receipt = { receiptId: string; status: "received"; submittedAt: string };
type LockReason = NonNullable<ReturnType<typeof closedAttemptReason>>;

/** How often the page saves a ready-to-submit draft for the server. */
const DRAFT_AUTOSAVE_MS = 20_000;

const LOCK_DESCRIPTIONS: Record<Exclude<LockReason, "deadline_auto_submit">, string> = {
  deadline_expired:
    "The time limit ended before any answers were saved, so this attempt is closed.",
  network_limit:
    "Your connection dropped more than twice, so this attempt has been locked.",
  focus_violation:
    "This attempt was locked because the assessment window lost focus too often or for too long.",
  locked:
    "Your attempt has been locked because of an integrity interruption or the time limit.",
};

function pageVisibility(): PageVisibility {
  return {
    hidden: document.hidden,
    focused: document.hasFocus(),
    fullscreen: Boolean(document.fullscreenElement),
  };
}
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
  /**
   * Applied to the state when the candidate presses continue, before it is
   * validated and saved: lets the continue button stand for a stage's own
   * "confirm" step instead of a second button.
   */
  beforeAdvance?: (stageIndex: number, state: TState) => TState;
};

/** Stages named in the header rather than counted ("Briefing", "Break"). */
const UNCOUNTED_STAGE_KINDS = new Set([
  "briefing",
  "custom:timed-briefing",
  "custom:countdown-break",
]);

function IntegrityAlert({
  open,
  tone,
  title,
  description,
  actionLabel,
  actionIcon,
  actionDisabled,
  onAction,
  secondaryActionLabel,
  secondaryActionIcon,
  onSecondaryAction,
}: {
  open: boolean;
  tone: "warning" | "destructive";
  title: string;
  description: ReactNode;
  actionLabel: string;
  actionIcon: ReactNode;
  actionDisabled?: boolean;
  onAction: () => void;
  secondaryActionLabel?: string;
  secondaryActionIcon?: ReactNode;
  onSecondaryAction?: () => void;
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
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="outline"
              className="rounded-sm"
              onClick={onSecondaryAction}
            >
              {secondaryActionIcon}
              {secondaryActionLabel}
            </Button>
          )}
          <AlertDialogAction
            ref={actionRef}
            className="rounded-sm"
            disabled={actionDisabled}
            onClick={onAction}
          >
            {actionIcon}
            {actionLabel}
          </AlertDialogAction>
        </div>
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
    beforeAdvance,
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
  // A page opened after the deadline auto-submits at once; the server decides
  // whether it is still inside its grace window.
  const [timeExpired, setTimeExpired] = useState(false);
  const [pauseReason, setPauseReason] = useState<string | null>(null);
  const [locked, setLockedState] = useState(false);
  const [lockReason, setLockReason] = useState<LockReason>("locked");
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [connectionNotice, setConnectionNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [replacementLaunch, setReplacementLaunch] =
    useState<LaunchEnvelope<TContent> | null>(null);
  const [timerAnnouncement, setTimerAnnouncement] = useState("");
  const [stageTimer, setStageTimer] = useState<StageTimer | null>(null);
  const startedAt = useRef(Date.now());
  const revisionRef = useRef(launch.progressRevision);
  const stateRef = useRef<TState>(restoredProgress.state);
  const stageIndexRef = useRef<number>(restoredProgress.stageIndex);
  const lastDraft = useRef<string | null>(null);
  const busy = useRef(false);
  const submitRef = useRef<(auto?: boolean) => Promise<void>>(async () => undefined);
  stateRef.current = state;
  stageIndexRef.current = stageIndex;

  /** Applies a lock or auto-submit the server reported. */
  const closeFromServer = useCallback((reason: LockReason) => {
    if (reason === "deadline_auto_submit") {
      setAutoSubmitted(true);
      return;
    }
    setLockReason(reason);
    setLockedState(true);
  }, []);
  const setLocked = useCallback(
    (value: boolean) => {
      if (value) closeFromServer("locked");
      else setLockedState(false);
    },
    [closeFromServer],
  );

  const draftFor = useCallback(
    (candidateState: TState) => {
      try {
        const elapsedSeconds = Math.max(
          1,
          Math.round((Date.now() - startedAt.current) / 1_000),
        );
        return buildSubmission(candidateState, elapsedSeconds);
      } catch {
        // An incomplete state may not build yet; the last good draft stands.
        return undefined;
      }
    },
    [buildSubmission],
  );
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
        if (result.status === "interrupted_locked") {
          closeFromServer(
            ["tab_hidden", "focus_lost", "fullscreen_exit"].includes(type)
              ? "focus_violation"
              : "locked",
          );
        }
      } catch (eventError) {
        const reason = closedAttemptReason(eventError);
        if (reason) closeFromServer(reason);
      }
    },
    [closeFromServer, launch.attemptId, launch.stageGraph.nodes, stageIndex],
  );

  const timerMode = launch.timerMode ?? (launch.module as { timerMode?: string })?.timerMode ?? "enforced";

  useEffect(() => {
    if (timerMode !== "enforced") return;
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
  }, [launch.deadlineAt, timerMode]);

  // Time is up: submit what the candidate has. The server accepts it inside
  // its grace window and otherwise submits the last saved draft itself.
  useEffect(() => {
    if (timerMode !== "enforced" || remaining > 0 || receipt || timeExpired) return;
    setTimeExpired(true);
    void submitRef.current(true);
  }, [timerMode, remaining, receipt, timeExpired]);

  useEffect(() => {
    const announcement = assessmentTimerAnnouncement(
      previousRemaining.current,
      remaining,
    );
    previousRemaining.current = remaining;
    if (announcement) setTimerAnnouncement(announcement);
  }, [remaining]);

  useEffect(() => {
    if (receipt || locked || autoSubmitted) return;
    const heartbeat = async () => {
      try {
        const beat = await AssessmentRuntimeClient.heartbeat(
          launch.attemptId,
          pageVisibility(),
        );
        lastHeartbeat.current = Date.now();
        if (beat.resumedAfterDrop) {
          const left = beat.networkResumesLeft ?? 0;
          setConnectionNotice(
            left > 0
              ? `Connection restored. Your timer kept running. If the connection drops ${left === 1 ? "once more" : `${left} more times`} for over a minute, the attempt will lock.`
              : "Connection restored. Your timer kept running. Another drop of over a minute will lock the attempt.",
          );
        } else {
          setConnectionNotice((notice) =>
            notice?.startsWith("Connection lost") ? null : notice,
          );
        }
        // The server's clock decides the deadline, for every timer mode.
        if (beat.deadlinePassed && !timeExpired) {
          setTimeExpired(true);
          void submitRef.current(true);
        }
      } catch (heartbeatError) {
        const reason = closedAttemptReason(heartbeatError);
        if (reason) {
          closeFromServer(reason);
          return;
        }
        if (
          Date.now() - lastHeartbeat.current >=
          launch.integrity.heartbeatLockSeconds * 1_000
        ) {
          // Paused, not locked: the server decides when the candidate is back.
          setConnectionNotice(
            "Connection lost. Reconnecting… Your timer keeps running, and work can't be saved until the connection returns.",
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
      window.clearInterval(timer);
    };
  }, [
    autoSubmitted,
    closeFromServer,
    launch.attemptId,
    launch.integrity.heartbeatIntervalSeconds,
    launch.integrity.heartbeatLockSeconds,
    locked,
    receipt,
    timeExpired,
  ]);

  // Keeps a ready-to-submit draft on the server, so a closed tab or a
  // blocked connection still ends in a submission at the deadline.
  useEffect(() => {
    if (receipt || locked || autoSubmitted) return;
    const autosave = async () => {
      if (busy.current) return;
      const draft = draftFor(stateRef.current);
      if (draft === undefined) return;
      const serialised = JSON.stringify(draft);
      if (serialised === lastDraft.current) return;
      busy.current = true;
      try {
        const saved = await AssessmentRuntimeClient.progress(
          launch.attemptId,
          revisionRef.current,
          { stageIndex: stageIndexRef.current, state: stateRef.current },
          draft,
        );
        revisionRef.current = saved.progressRevision;
        setRevision(saved.progressRevision);
        lastDraft.current = serialised;
      } catch (saveError) {
        const reason = closedAttemptReason(saveError);
        if (reason) closeFromServer(reason);
        // Other failures (a revision race, a dropped connection) retry on the
        // next tick; the stage save path reconciles revisions.
      } finally {
        busy.current = false;
      }
    };
    const timer = window.setInterval(() => void autosave(), DRAFT_AUTOSAVE_MS);
    return () => window.clearInterval(timer);
  }, [autoSubmitted, closeFromServer, draftFor, launch.attemptId, locked, receipt]);

  useEffect(() => {
    if (receipt || locked) return;
    const endLoss = (
      type: "tab_hidden" | "focus_lost" | "fullscreen_exit",
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
    const blur = () =>
      beginLoss(
        "focus_lost",
        "The assessment paused because focus left the window.",
      );
    const focus = () => endLoss("focus_lost");
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
    if (launch.integrity.pauseOnHidden) {
      document.addEventListener("visibilitychange", visibility);
      window.addEventListener("blur", blur);
      window.addEventListener("focus", focus);
    }
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
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", focus);
      document.removeEventListener("fullscreenchange", fullscreen);
      document.removeEventListener("copy", blockClipboard);
      document.removeEventListener("cut", blockClipboard);
      document.removeEventListener("paste", blockClipboard);
      document.removeEventListener("contextmenu", blockContext);
    };
  }, [launch.integrity, locked, receipt, recordEvent]);

  const next = useCallback(async (nextState?: TState) => {
    const stateToSave = beforeAdvance
      ? beforeAdvance(stageIndex, nextState ?? state)
      : (nextState ?? state);
    const validationError = validateStage(stageIndex, stateToSave);
    if (validationError) {
      setError(validationError);
      return;
    }
    const nextIndex = stageIndex + 1;
    setSaving(true);
    busy.current = true;
    try {
      const draft = draftFor(stateToSave);
      const saved = await AssessmentRuntimeClient.progress(
        launch.attemptId,
        revisionRef.current,
        { stageIndex: nextIndex, state: stateToSave },
        draft,
      );
      revisionRef.current = saved.progressRevision;
      if (draft !== undefined) lastDraft.current = JSON.stringify(draft);
      setRevision(saved.progressRevision);
      if (stateToSave !== state) setState(stateToSave);
      setStageIndex(nextIndex);
      setError(null);
    } catch (saveError) {
      const closed = closedAttemptReason(saveError);
      if (closed) {
        closeFromServer(closed);
        return;
      }
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
          revisionRef.current = resumed.progressRevision;
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
      busy.current = false;
      setSaving(false);
    }
  }, [beforeAdvance, closeFromServer, draftFor, launch.attemptId, stageIndex, state, validateStage]);

  const submit = useCallback(async (auto = false) => {
    if (locked || autoSubmitted || receipt) return;
    if (!auto) {
      if (timeExpired) return;
      const validationError = validateStage(stageIndex, state);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    setSubmitting(true);
    busy.current = true;
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
      const closed = closedAttemptReason(submitError);
      if (closed) {
        closeFromServer(closed);
      } else {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Submission was not accepted",
        );
      }
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  }, [
    autoSubmitted,
    buildSubmission,
    closeFromServer,
    receipt,
    launch.attemptId,
    launch.module.slug,
    launch.stageGraph.nodes.length,
    locked,
    stageIndex,
    state,
    timeExpired,
    title,
    validateStage,
  ]);

  submitRef.current = submit;

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
  // Count only the parts a candidate works through: briefings, breaks and
  // the review page are named instead, so "3 of 20" matches the questions.
  const workIndexes = launch.stageGraph.nodes
    .slice(0, reviewIndex)
    .flatMap((node, index) => (UNCOUNTED_STAGE_KINDS.has(node.kind) ? [] : [index]));
  const workPosition = workIndexes.indexOf(stageIndex);
  // Briefings, breaks and review are already named by the stage title.
  const progressLabel = workPosition >= 0 ? `${workPosition + 1} of ${workIndexes.length}` : null;
  const stageProgress = reviewIndex > 0 ? Math.min(100, (stageIndex / reviewIndex) * 100) : 0;
  const durationMinutes = (launch.module as { durationMinutes?: { minimum: number; maximum: number } })
    ?.durationMinutes;
  const clock = stageTimer
    ? { label: stageTimer.label, value: formatClock(stageTimer.seconds), tone: "text-foreground", seconds: stageTimer.seconds }
    : timerMode === "enforced"
      ? {
          label: "Time left",
          value: formatClock(remaining),
          seconds: remaining,
          tone:
            remaining <= 60
              ? "text-destructive"
              : remaining <= 300
                ? "text-warning"
                : "text-foreground",
        }
      : timerMode === "display_only"
        ? {
            label: "Expected",
            value: `${durationMinutes?.minimum ?? 5}–${durationMinutes?.maximum ?? 10} min`,
            seconds: null,
            tone: "text-foreground",
          }
        : null;
  const advanceHeld = Boolean(stageTimer?.holdsAdvance && stageTimer.seconds > 0);
  return (
    <main className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">{title}</p>
            <p className="truncate text-sm font-semibold">
              {currentNode?.title ?? "Assessment"}
              {progressLabel ? (
                <span className="ml-2 font-normal tabular-nums text-muted-foreground">
                  {progressLabel}
                </span>
              ) : null}
            </p>
          </div>
          <span
            className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"
            title="This attempt is monitored"
          >
            <RadioTower className="h-3.5 w-3.5" aria-hidden="true" /> Monitored
          </span>
          {clock ? (
            <div className="flex min-w-[6.5rem] flex-col items-end border-l border-border pl-4">
              <span className="text-[11px] leading-4 text-muted-foreground">{clock.label}</span>
              <span
                className={`flex items-center gap-1.5 font-mono text-lg font-semibold leading-6 tabular-nums ${clock.tone}`}
                aria-label={
                  clock.seconds === null ? clock.value : `${clock.label}: ${clock.seconds} seconds`
                }
              >
                <Clock3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {clock.value}
              </span>
            </div>
          ) : null}
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
        <div
          className="h-0.5 bg-muted"
          role="progressbar"
          aria-label="Assessment progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(stageProgress)}
          aria-valuetext={progressLabel ?? currentNode?.title}
        >
          <div
            className="h-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
            style={{ width: `${stageProgress}%` }}
          />
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-6 sm:px-6 sm:pt-8">
        <div className="flex flex-1 flex-col">
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
            {connectionNotice && !receipt && !autoSubmitted ? (
              <div
                role="status"
                className="mb-5 flex gap-3 border border-border bg-card p-4 text-sm text-foreground"
              >
                <RadioTower className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                {connectionNotice}
              </div>
            ) : null}
            {autoSubmitted && !receipt ? (
              <section
                className="border border-border bg-card p-8 text-center"
                aria-labelledby="auto-submit-title"
              >
                <CheckCircle2
                  className="mx-auto h-10 w-10 text-primary"
                  aria-hidden="true"
                />
                <h1 id="auto-submit-title" className="mt-4 text-2xl font-semibold">
                  Time is up: your answers were submitted
                </h1>
                <p className="mx-auto mt-3 max-w-xl leading-7 text-muted-foreground">
                  The time limit ended, so your last saved answers were submitted
                  for scoring and review automatically. No result is shown here.
                </p>
                <Button
                  className="mt-7 rounded-sm"
                  onClick={() => {
                    window.location.href = "/candidate-dashboard";
                  }}
                >
                  Return to candidate portal
                </Button>
              </section>
            ) : receipt ? (
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
                <div className="pb-8">
                  <StageTimerContext.Provider value={setStageTimer}>
                    {renderStage({ stageIndex, state, setState, advance: next, isSaving: saving }, launch.content)}
                  </StageTimerContext.Provider>
                </div>
                <div className="sticky bottom-0 z-20 -mx-4 mt-auto flex min-h-16 items-center justify-end gap-4 border-t border-border bg-background px-4 py-3 sm:-mx-6 sm:px-6">
                  {stageIndex < reviewIndex && canManuallyAdvance(stageIndex) ? (
                    <Button
                      className="min-h-11 rounded-sm px-6"
                      onClick={() => void next()}
                      disabled={saving || locked || timeExpired || advanceHeld}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : null}
                      {advanceHeld && stageTimer
                        ? `Continue in ${formatClock(stageTimer.seconds)}`
                        : continueLabel(stageIndex)}
                    </Button>
                  ) : stageIndex === reviewIndex ? (
                    <Button
                      className="min-h-12 rounded-sm px-7"
                      onClick={() => void submit()}
                      disabled={submitting || locked || timeExpired}
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <FileCheck2 className="h-4 w-4" aria-hidden="true" />
                      )}
                      Submit assessment
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      This step moves on automatically.
                    </span>
                  )}
                </div>
              </>
            )}
        </div>
      </div>
      <IntegrityAlert
        open={Boolean(pauseReason) && !locked && !autoSubmitted && !receipt}
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
        description={`${LOCK_DESCRIPTIONS[lockReason === "deadline_auto_submit" ? "locked" : lockReason]} You can't continue or restart this attempt yourself: your hiring manager must approve a new attempt. Contact them, or CTRL support using Support tickets in your candidate portal.`}
        actionLabel="Exit"
        actionIcon={<LogOut className="h-4 w-4" aria-hidden="true" />}
        onAction={async () => {
          if (document.fullscreenElement) {
            await document.exitFullscreen().catch(() => undefined);
          }
          window.location.href = "/candidate-dashboard";
        }}
        secondaryActionLabel="Open support"
        secondaryActionIcon={<HelpCircle className="h-4 w-4" aria-hidden="true" />}
        onSecondaryAction={async () => {
          if (document.fullscreenElement) {
            await document.exitFullscreen().catch(() => undefined);
          }
          window.location.href = "/candidate-dashboard/help-support";
        }}
      />
    </main>
  );
}
