'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, MouseEvent, PointerEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  GripVertical,
  ListChecks,
  Loader2,
  LogOut,
  MousePointer,
  Play,
  ShieldCheck,
  Target,
  Timer,
} from 'lucide-react';
import { AssessmentGameShell, AssessmentFlowStepper } from '@/components/assessment/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { closeAssessmentWindow, notifyAssessmentCompleted } from '@/lib/assessment-completion';
import { cn } from '@/lib/utils';
import { initPjaSession } from '@/app/actions/assessment-pja.actions';

type Incident = {
  id: string;
  letter: string;
  title: string;
  description: string;
  timeOfIncident: string;
};

type PriorityRound = {
  id: string;
  title: string;
  incidents: Incident[];
};

type PrioritisationContent = {
  practiceRounds: PriorityRound[];
  finalRounds: PriorityRound[];
};

function PrioritisationAnimationPreview() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 10);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  const card1InBank = step < 4;
  const card2InBank = step < 8;

  const slot1Content = step >= 4 ? "A. Armed Robbery" : null;
  const slot2Content = step >= 8 ? "B. Noise Complaint" : null;

  const isCard1Selected = step === 2 || step === 3;
  const isCard2Selected = step === 6 || step === 7;

  let cursorTop = '10%';
  let cursorLeft = '80%';
  let cursorActive = false;

  if (step === 1) {
    cursorTop = '28%';
    cursorLeft = '30%';
  } else if (step === 2) {
    cursorTop = '28%';
    cursorLeft = '30%';
    cursorActive = true;
  } else if (step === 3) {
    cursorTop = '70%';
    cursorLeft = '30%';
  } else if (step === 4) {
    cursorTop = '70%';
    cursorLeft = '30%';
    cursorActive = true;
  } else if (step === 5) {
    cursorTop = '28%';
    cursorLeft = '70%';
  } else if (step === 6) {
    cursorTop = '28%';
    cursorLeft = '70%';
    cursorActive = true;
  } else if (step === 7) {
    cursorTop = '70%';
    cursorLeft = '70%';
  } else if (step === 8) {
    cursorTop = '70%';
    cursorLeft = '70%';
    cursorActive = true;
  } else if (step === 9) {
    cursorTop = '50%';
    cursorLeft = '90%';
  }

  return (
    <div className="relative w-full rounded-xl border border-border bg-muted/40 p-4 shadow-inner dark:bg-black/20 overflow-hidden min-h-[300px] flex flex-col justify-between">
      <div className="mb-2 flex items-center justify-between border-b border-border/50 pb-2 text-xs text-muted-foreground">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Sorting Demo</span>
      </div>

      <div className="space-y-4">
        {/* Incident Bank Box */}
        <div>
          <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-primary block mb-1">Incident Bank:</span>
          <div className="grid grid-cols-2 gap-2 bg-background/50 rounded-lg p-2 border border-border/40 min-h-[75px]">
            {card1InBank ? (
              <div className={cn(
                "rounded border p-2 text-[10px] bg-background flex items-center gap-1.5 select-none transition-all duration-300",
                isCard1Selected ? "border-primary ring-1 ring-primary/30" : "border-border/60"
              )}>
                <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate font-medium text-foreground">A. Armed Robbery</span>
              </div>
            ) : (
              <div className="rounded border border-dashed border-border/30 bg-muted/10 flex items-center justify-center text-[9px] text-muted-foreground/45 select-none">
                Placed
              </div>
            )}

            {card2InBank ? (
              <div className={cn(
                "rounded border p-2 text-[10px] bg-background flex items-center gap-1.5 select-none transition-all duration-300",
                isCard2Selected ? "border-primary ring-1 ring-primary/30" : "border-border/60"
              )}>
                <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate font-medium text-foreground">B. Noise Complaint</span>
              </div>
            ) : (
              <div className="rounded border border-dashed border-border/30 bg-muted/10 flex items-center justify-center text-[9px] text-muted-foreground/45 select-none">
                Placed
              </div>
            )}
          </div>
        </div>

        {/* Priority List Box */}
        <div>
          <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400 block mb-1">Priority List:</span>
          <div className="grid grid-cols-2 gap-2">
            {/* Slot 1 */}
            <div className={cn(
              "rounded border p-2 text-[10px] min-h-[50px] flex flex-col justify-center transition-all duration-300 select-none",
              slot1Content 
                ? "border-green-500/50 bg-green-500/5 text-foreground font-semibold" 
                : "border-dashed border-border bg-background/30 text-muted-foreground/50 items-center justify-center text-[9px]"
            )}>
              {slot1Content ? (
                <div className="flex items-center gap-1">
                  <Badge className="bg-green-600 hover:bg-green-600 px-1 py-0 text-[8px] h-3.5 shrink-0">Rank 1</Badge>
                  <span className="truncate font-medium">{slot1Content}</span>
                </div>
              ) : (
                "Place Rank 1"
              )}
            </div>

            {/* Slot 2 */}
            <div className={cn(
              "rounded border p-2 text-[10px] min-h-[50px] flex flex-col justify-center transition-all duration-300 select-none",
              slot2Content 
                ? "border-green-500/50 bg-green-500/5 text-foreground font-semibold" 
                : "border-dashed border-border bg-background/30 text-muted-foreground/50 items-center justify-center text-[9px]"
            )}>
              {slot2Content ? (
                <div className="flex items-center gap-1">
                  <Badge className="bg-green-600 hover:bg-green-600 px-1 py-0 text-[8px] h-3.5 shrink-0">Rank 2</Badge>
                  <span className="truncate font-medium">{slot2Content}</span>
                </div>
              ) : (
                "Place Rank 2"
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Virtual Cursor */}
      <div 
        className="absolute z-10 transition-all duration-700 ease-in-out pointer-events-none"
        style={{ top: cursorTop, left: cursorLeft }}
      >
        <div className="relative">
          <MousePointer className={cn(
            "h-5 w-5 text-foreground drop-shadow-md transition-transform duration-150",
            cursorActive ? "scale-75" : "scale-100"
          )} />
          {cursorActive && (
            <span className="absolute left-0 top-0 h-4 w-4 animate-ping rounded-full bg-primary/40" />
          )}
        </div>
      </div>
    </div>
  );
}

type AssessmentSessionConfig = {
  version?: string;
  difficulty?: string;
};

type Phase =
  | 'landing'
  | 'rules'
  | 'practice-round'
  | 'practice-review'
  | 'practice-complete'
  | 'final-round'
  | 'submitting'
  | 'submitted';

type RoundSnapshot = {
  mode: 'practice' | 'final';
  roundId: string;
  roundNumber: number;
  order: string[];
};

type PrioritySlot = string | null;

const fallbackContent: PrioritisationContent = {
  version: '1.0.0',
  pjaRounds: [
    {
      id: 'fallback-practice',
      title: 'Practice round',
      incidents: [
        {
          id: 'P-01',
          letter: 'A',
          title: 'Road traffic collision',
          description: 'Traffic is moving around the scene.',
          timeOfIncident: 'Happening now',
        },
        {
          id: 'P-02',
          letter: 'B',
          title: 'Noise complaint',
          description: 'Caller reports shouting and loud music.',
          timeOfIncident: 'Happening now',
        },
        {
          id: 'P-03',
          letter: 'C',
          title: 'Missing child',
          description: 'Young child separated from parent near the main exit.',
          timeOfIncident: 'Happening now',
        },
        {
          id: 'P-04',
          letter: 'D',
          title: 'Suspicious vehicle',
          description: 'Occupants watching a staff entrance. No weapons seen.',
          timeOfIncident: 'Happening now',
        },
      ],
    },
  ],
};

export default function PrioritisationTest({
  candidateSessionDocumentId,
}: {
  candidateSessionDocumentId?: string | null;
}) {
  const [phase, setPhase] = useState<Phase>('landing');
  const [content, setContent] = useState<PrioritisationContent>(fallbackContent);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [finalIndex, setFinalIndex] = useState(0);
  const [prioritySlots, setPrioritySlots] = useState<PrioritySlot[]>([]);
  const [snapshots, setSnapshots] = useState<RoundSnapshot[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [pressedIncidentId, setPressedIncidentId] = useState<string | null>(null);
  const [draggingIncidentId, setDraggingIncidentId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const sessionConfigRef = useRef<AssessmentSessionConfig>({});

  const practiceRounds = useMemo(() => {
    return content.pjaRounds.filter((r: any) => r.type === 'practice');
  }, [content.pjaRounds]);

  const finalRounds = useMemo(() => {
    return content.pjaRounds.filter((r: any) => r.type === 'test' || r.type === 'final' || !r.type);
  }, [content.pjaRounds]);

  const activeMode: 'practice' | 'final' =
    phase === 'final-round' || phase === 'submitting' || phase === 'submitted'
      ? 'final'
      : 'practice';
  const activeRounds =
    activeMode === 'practice' ? practiceRounds : finalRounds;
  const activeIndex = activeMode === 'practice' ? practiceIndex : finalIndex;
  const activeRound = activeRounds[activeIndex] ?? activeRounds[0] ?? fallbackContent.pjaRounds[0];
  const activeIncidentMap = useMemo(() => {
    return new Map(activeRound.incidents.map((incident) => [incident.id, incident]));
  }, [activeRound.incidents]);
  const placedIncidentIds = prioritySlots.filter((incidentId): incidentId is string =>
    Boolean(incidentId)
  );
  const availableIncidents = activeRound.incidents.filter(
    (incident) => !placedIncidentIds.includes(incident.id)
  );
  const latestSnapshot = snapshots[snapshots.length - 1];
  const finalProgress =
    finalRounds.length > 0
      ? ((finalIndex + 1) / finalRounds.length) * 100
      : 0;

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        setLoading(true);
        setError(null);
        const sessionData = await initPjaSession(candidateSessionDocumentId);
        if (cancelled) return;
        if (sessionData && sessionData.runs && sessionData.runs.length > 0) {
          setContent({ version: sessionData.config?.version || '1.0.0', pjaRounds: sessionData.runs });
          sessionConfigRef.current = sessionData.config ?? {};
          setLoading(false);
          return;
        } else {
          throw new Error('No assessment runs returned from the session initialization.');
        }
      } catch (err: any) {
        console.error('[PrioritisationTest] Failed to load PJA session from backend:', err);
        if (!cancelled) {
          setError(err.message || 'Failed to initialize session. Please check your network connection.');
          setLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [candidateSessionDocumentId]);

  const startPractice = useCallback(() => {
    const firstRound = practiceRounds[0] ?? fallbackContent.pjaRounds[0];
    startedAtRef.current = new Date().toISOString();
    setPracticeIndex(0);
    setFinalIndex(0);
    setSnapshots([]);
    setSubmitError(null);
    setPrioritySlots(Array(firstRound.incidents.length).fill(null));
    setSelectedIncidentId(null);
    setPressedIncidentId(null);
    setDraggingIncidentId(null);
    setPhase('practice-round');
  }, [practiceRounds]);

  const startFinal = useCallback(() => {
    const firstRound = finalRounds[0];
    if (!firstRound) return;

    setFinalIndex(0);
    setPrioritySlots(Array(firstRound.incidents.length).fill(null));
    setSelectedIncidentId(null);
    setPressedIncidentId(null);
    setDraggingIncidentId(null);
    setPhase('final-round');
  }, [finalRounds]);

  const closeAssessment = useCallback(() => {
    closeAssessmentWindow();
  }, []);

  const placeIncident = (incidentId: string, targetIndex: number) => {
    setPrioritySlots((currentSlots) => {
      const slotCount = activeRound.incidents.length;
      const nextSlots =
        currentSlots.length === slotCount
          ? [...currentSlots]
          : Array(slotCount).fill(null);
      const safeIndex = Math.max(0, Math.min(targetIndex, slotCount - 1));
      const currentIndex = nextSlots.indexOf(incidentId);
      const displacedIncidentId = nextSlots[safeIndex];

      if (currentIndex >= 0) {
        nextSlots[currentIndex] = displacedIncidentId ?? null;
      }

      nextSlots[safeIndex] = incidentId;
      return nextSlots;
    });
    setSelectedIncidentId(null);
    setPressedIncidentId(null);
    setDraggingIncidentId(null);
  };

  const removeIncidentFromRanking = (incidentId: string) => {
    setPrioritySlots((currentSlots) =>
      currentSlots.map((currentId) =>
        currentId === incidentId ? null : currentId
      )
    );
    setSelectedIncidentId(null);
    setPressedIncidentId(null);
    setDraggingIncidentId(null);
  };

  const handleDragStart = (
    event: DragEvent<HTMLElement>,
    incidentId: string
  ) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', incidentId);
    setSelectedIncidentId(incidentId);
    setDraggingIncidentId(incidentId);
  };

  const handleDragEnd = () => {
    setPressedIncidentId(null);
    setDraggingIncidentId(null);
  };

  const handleCardClick = (
    event: MouseEvent<HTMLElement>,
    incidentId: string
  ) => {
    event.stopPropagation();
    setSelectedIncidentId((currentId) =>
      currentId === incidentId ? null : incidentId
    );
  };

  const handleRankedCardClick = (
    event: MouseEvent<HTMLElement>,
    incidentId: string,
    targetIndex: number
  ) => {
    event.stopPropagation();

    if (selectedIncidentId && selectedIncidentId !== incidentId) {
      placeIncident(selectedIncidentId, targetIndex);
      return;
    }

    setSelectedIncidentId((currentId) =>
      currentId === incidentId ? null : incidentId
    );
  };

  const handleCardPointerDown = (
    event: PointerEvent<HTMLElement>,
    incidentId: string
  ) => {
    if (event.button !== 0) return;
    setPressedIncidentId(incidentId);
  };

  const handleCardPointerUp = () => {
    setPressedIncidentId(null);
  };

  const handleDropOnPriority = (
    event: DragEvent<HTMLElement>,
    targetIndex: number
  ) => {
    event.preventDefault();
    const incidentId = event.dataTransfer.getData('text/plain');

    if (!incidentId || !activeIncidentMap.has(incidentId)) return;

    placeIncident(incidentId, targetIndex);
  };

  const handleSlotClick = (targetIndex: number) => {
    if (!selectedIncidentId || !activeIncidentMap.has(selectedIncidentId)) return;

    placeIncident(selectedIncidentId, targetIndex);
  };

  const handleDropOnBank = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const incidentId = event.dataTransfer.getData('text/plain');

    if (!incidentId || !activeIncidentMap.has(incidentId)) return;

    removeIncidentFromRanking(incidentId);
  };

  const completePracticeRound = () => {
    const snapshot: RoundSnapshot = {
      mode: 'practice',
      roundId: activeRound.id,
      roundNumber: practiceIndex + 1,
      order: placedIncidentIds,
    };
    setSnapshots((currentSnapshots) => [...currentSnapshots, snapshot]);

    if (practiceIndex >= practiceRounds.length - 1) {
      setPhase('practice-complete');
      return;
    }

    setPhase('practice-review');
  };

  const continuePractice = () => {
    const nextIndex = practiceIndex + 1;
    const nextRound = practiceRounds[nextIndex];
    if (!nextRound) return;

    setPracticeIndex(nextIndex);
    setPrioritySlots(Array(nextRound.incidents.length).fill(null));
    setSelectedIncidentId(null);
    setPressedIncidentId(null);
    setDraggingIncidentId(null);
    setPhase('practice-round');
  };

  const completeFinalRound = () => {
    const snapshot: RoundSnapshot = {
      mode: 'final',
      roundId: activeRound.id,
      roundNumber: finalIndex + 1,
      order: placedIncidentIds,
    };
    setSnapshots((currentSnapshots) => [...currentSnapshots, snapshot]);

    if (finalIndex >= finalRounds.length - 1) {
      setPhase('submitting');
      return;
    }

    const nextIndex = finalIndex + 1;
    const nextRound = finalRounds[nextIndex];
    setFinalIndex(nextIndex);
    setPrioritySlots(Array(nextRound.incidents.length).fill(null));
    setSelectedIncidentId(null);
    setPressedIncidentId(null);
    setDraggingIncidentId(null);
  };

  useEffect(() => {
    if (phase !== 'submitting') return;

    let cancelled = false;

    const submitAssessment = async () => {
      const finalRounds = snapshots
        .filter((snapshot) => snapshot.mode === 'final')
        .map((snapshot) => ({
          roundId: snapshot.roundId,
          order: snapshot.order,
        }));

      try {
        const response = await fetch('/api/assessment/prioritisation/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rounds: finalRounds,
            startedAt: startedAtRef.current ?? new Date().toISOString(),
            completedAt: new Date().toISOString(),
            candidateSessionDocumentId,
            assessmentVersion: sessionConfigRef.current.version,
            difficulty: sessionConfigRef.current.difficulty,
          }),
        });

        if (cancelled) return;

        if (response.ok || response.status === 409) {
          notifyAssessmentCompleted('prioritisation');
          setSubmitError(null);
        } else {
          const body = await response.json().catch(() => ({}));
          setSubmitError(
            (body as { error?: string }).error ??
              'Submission failed. Please contact support.'
          );
        }
      } catch {
        if (!cancelled) setSubmitError('Network error. Please contact support.');
      } finally {
        if (!cancelled) setPhase('submitted');
      }
    };

    void submitAssessment();

    return () => {
      cancelled = true;
    };
  }, [candidateSessionDocumentId, phase, snapshots]);

  const renderRound = (mode: 'practice' | 'final') => {
    const isFinal = mode === 'final';
    const roundNumber = isFinal ? finalIndex + 1 : practiceIndex + 1;
    const totalRounds = isFinal ? finalRounds.length : practiceRounds.length;
    const hasActiveCard = Boolean(selectedIncidentId || draggingIncidentId);
    const placedCount = placedIncidentIds.length;

    return (
      <div className="mx-auto flex min-h-[560px] w-full flex-col justify-center">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {isFinal ? 'Final submission' : 'Practice'}
              </p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {activeRound.title}
              </p>
              <div className="mt-2 max-w-2xl space-y-4 text-sm leading-6 text-muted-foreground">
                <p>Review the six incidents below.</p>
                <div>
                  <p>Rank them from 1 to 6, with:</p>
                  <ul className="ml-4 list-disc space-y-1 mt-1">
                    <li>1 = Highest priority</li>
                    <li>6 = Lowest priority</li>
                  </ul>
                </div>
                <p>Each incident must have a different ranking.</p>
                <p>
                  Consider urgency, seriousness, vulnerability, immediacy, public safety and potential risk when deciding your order.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                Round {roundNumber}/{totalRounds}
              </Badge>
              <Badge variant="outline">
                {activeRound.incidents.length} incidents
              </Badge>
            </div>
          </div>
          {isFinal && <Progress value={finalProgress} className="mt-4 h-2" />}
        </div>

        <div className="mt-5 space-y-4">
          <section
            className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDropOnBank}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">Incident bank</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review the full incident details before placing a card.
                </p>
              </div>
              <Badge variant="outline">{availableIncidents.length} left</Badge>
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              {availableIncidents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground dark:border-white/10 xl:col-span-2">
                  All incidents have been placed.
                </div>
              ) : (
                availableIncidents.map((incident) => (
                  <button
                    key={incident.id}
                    type="button"
                    draggable
                    onDragStart={(event) => handleDragStart(event, incident.id)}
                    onDragEnd={handleDragEnd}
                    onClick={(event) => handleCardClick(event, incident.id)}
                    onPointerDown={(event) => handleCardPointerDown(event, incident.id)}
                    onPointerUp={handleCardPointerUp}
                    onPointerCancel={handleCardPointerUp}
                    onPointerLeave={handleCardPointerUp}
                    className={[
                      'w-full text-left ctrl-priority-card cursor-grab overflow-hidden rounded-xl border bg-gradient-to-br from-background via-background to-muted/30 p-0 shadow-[0_14px_34px_rgba(2,6,23,0.14)] transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_18px_40px_rgba(2,6,23,0.2)] active:cursor-grabbing dark:from-[#0d1320] dark:via-[#080d18] dark:to-[#050811] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                      selectedIncidentId === incident.id
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-border dark:border-white/10',
                      pressedIncidentId === incident.id || draggingIncidentId === incident.id
                        ? 'ctrl-priority-card-active'
                        : '',
                    ].join(' ')}
                  >
                    <div className="flex h-full">
                      <div className="w-1.5 bg-primary/70" />
                      <div className="flex min-w-0 flex-1 items-start gap-3 p-4">
                        <GripVertical className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{incident.id}</Badge>
                            <p className="font-semibold text-foreground">{incident.title}</p>
                          </div>
                          <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                            <p>
                              <span className="font-medium text-foreground">Time:</span>{' '}
                              {incident.timeOfIncident}
                            </p>
                            <p className="md:col-span-2">
                              <span className="font-medium text-foreground">Description:</span>{' '}
                              {incident.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">Priority list</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Position 1 is the highest priority.
                </p>
              </div>
              <Badge variant="outline">
                {placedCount}/{activeRound.incidents.length} placed
              </Badge>
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              {Array.from({ length: activeRound.incidents.length }).map((_, index) => {
                const slotIncidentId = prioritySlots[index];
                const incident = slotIncidentId
                  ? activeIncidentMap.get(slotIncidentId)
                  : null;

                if (!incident) {
                  return (
                    <button
                      key={`${activeRound.id}-slot-${index}`}
                      type="button"
                      onClick={() => handleSlotClick(index)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => handleDropOnPriority(event, index)}
                      className={[
                        'w-full text-left min-h-[118px] rounded-xl border p-3 transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                        'border-dashed border-border bg-muted/20 dark:border-white/10 dark:bg-white/[0.02]',
                        hasActiveCard ? 'ctrl-priority-slot-glow cursor-copy' : '',
                        selectedIncidentId ? 'hover:border-primary/60 hover:ring-1 hover:ring-primary/20' : '',
                      ].join(' ')}
                    >
                      <div className="flex h-full min-h-[92px] items-center justify-center rounded-lg text-sm text-muted-foreground">
                        Drop priority {index + 1} here
                      </div>
                    </button>
                  );
                }

                return (
                  <div
                    key={`${activeRound.id}-slot-${index}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDropOnPriority(event, index)}
                    className="min-h-[118px] rounded-xl border p-3 border-border bg-background/70 dark:border-white/10 dark:bg-[#070b13]/80"
                  >
                    <button
                      type="button"
                      draggable
                      onDragStart={(event) => handleDragStart(event, incident.id)}
                      onDragEnd={handleDragEnd}
                      onClick={(event) => handleRankedCardClick(event, incident.id, index)}
                      onPointerDown={(event) => handleCardPointerDown(event, incident.id)}
                      onPointerUp={handleCardPointerUp}
                      onPointerCancel={handleCardPointerUp}
                      onPointerLeave={handleCardPointerUp}
                      className={[
                        'w-full text-left ctrl-priority-card -m-1 grid cursor-grab gap-3 overflow-hidden rounded-xl bg-gradient-to-br from-background via-background to-muted/30 p-1 active:cursor-grabbing md:grid-cols-[52px_1fr] dark:from-[#0d1320] dark:via-[#080d18] dark:to-[#050811] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                        selectedIncidentId === incident.id
                          ? 'rounded-lg ring-2 ring-primary/30'
                          : '',
                        pressedIncidentId === incident.id || draggingIncidentId === incident.id
                          ? 'ctrl-priority-card-active'
                          : '',
                      ].join(' ')}
                    >
                      <div className="flex h-full min-h-20 w-12 items-center justify-center rounded-xl bg-primary/10 font-mono text-base font-semibold text-primary">
                        {index + 1}
                      </div>
                      <div className="min-w-0 border-l border-primary/20 pl-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{incident.id}</Badge>
                          <p className="font-semibold text-foreground">
                            {incident.title}
                          </p>
                        </div>
                        <div className="mt-2 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                          <p>
                            <span className="font-medium text-foreground">Time:</span>{' '}
                            {incident.timeOfIncident}
                          </p>
                          <p className="md:col-span-2">
                            <span className="font-medium text-foreground">Description:</span>{' '}
                            {incident.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Place every incident before submitting this round.
          </p>
          <Button
            onClick={isFinal ? completeFinalRound : completePracticeRound}
            disabled={placedCount !== activeRound.incidents.length}
          >
            {isFinal ? 'Submit final round' : 'Complete practice round'}
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 font-medium">Loading assessment...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center bg-background text-foreground">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold">Failed to load assessment</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-6 h-10 px-4">
          Retry
        </Button>
      </div>
    );
  }

  // Resolve current stepper phase
  const stepperStep = 
    phase === 'landing' || phase === 'rules'
      ? 'welcome'
      : phase === 'practice-round'
        ? 'practice'
        : phase === 'practice-review' || phase === 'practice-complete'
          ? 'review'
          : 'live';

  return (
    <AssessmentGameShell
      icon={ClipboardList}
      title="Prioritisation Judgement Assessment"
      eyebrow="CTRL assessment"
      status={
        phase === 'final-round'
          ? `Final round ${finalIndex + 1}/${finalRounds.length}`
          : phase === 'practice-round'
            ? `Practice round ${practiceIndex + 1}/${practiceRounds.length}`
            : 'Incident queue'
      }
    >
      <div className="flex flex-col w-full">
        {/* Visual Stepper Progress */}
        {phase !== 'practice-round' && phase !== 'final-round' && phase !== 'submitting' && phase !== 'submitted' && (
          <div className="mb-6 w-full">
            <AssessmentFlowStepper currentStep={stepperStep} />
          </div>
        )}
        {phase === 'landing' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className="mb-5 flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Secure judgement exercise
          </div>
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <ClipboardList className="h-8 w-8" aria-hidden="true" />
          </div>
          <p className="max-w-2xl text-2xl font-semibold leading-tight tracking-normal text-foreground sm:text-3xl">
            Prioritisation Judgement Assessment
          </p>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Review incoming incidents, decide what needs attention first, and place every item into a clear priority order.
          </p>
          <div className="mt-6 grid w-full max-w-2xl gap-3 text-left sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <Timer className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">Three practice rounds</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Get used to the format before scoring begins.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <Target className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">Six incidents each</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Rank each queue from highest to lowest priority.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <ListChecks className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">Fifteen live rounds</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Your live ranking decisions are submitted securely.</p>
            </div>
          </div>
          <Button className="mt-8 h-12 px-7" size="lg" onClick={() => setPhase('rules')}>
            Read Instructions
            <Play className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {phase === 'rules' && (
        <div className="mx-auto flex min-h-[520px] w-full flex-col justify-center py-6">
          <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10 text-primary">
                Incident priority judgement
              </Badge>
              <h1 className="mb-4 text-3xl font-semibold leading-tight text-foreground">CTRL Prioritisation Judgement Assessment</h1>
              <p>
                This assessment is designed to understand how you prioritise reported incidents when several incidents are presented at the same time. It assesses judgement, not formal police knowledge.
              </p>
              <p className="mt-4">
                You are not expected to know formal police grading policies, deployment procedures, force-specific systems or emergency service terminology. Use your own judgement based on the information provided.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr]">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ClipboardList className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mb-3 text-lg font-semibold text-foreground">What You Will See</h2>
                <p>Each question contains six incident tiles. Each tile contains:</p>
                <div className="mt-4 grid gap-2">
                  {['Incident title', 'Incident description', 'Time of incident'].map((item) => (
                    <div key={item} className="flex items-center gap-2 rounded-lg bg-muted p-3 text-foreground dark:bg-white/5">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <ListChecks className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mb-3 text-lg font-semibold text-foreground">Your Task</h2>
                <p>Review all six incidents and rank them from highest priority to lowest priority.</p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    ['1', 'Highest'],
                    ['2', 'Second'],
                    ['3', 'Third'],
                    ['4', 'Fourth'],
                    ['5', 'Fifth'],
                    ['6', 'Lowest'],
                  ].map(([rank, label]) => (
                    <div key={rank} className="rounded-lg border border-border bg-background p-2.5 text-center dark:border-white/10 dark:bg-white/[0.02]">
                      <p className="text-sm font-semibold text-foreground">{rank}</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p className="text-xs">
                      Each incident must have a different ranking. Do not give the same ranking to more than one incident.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03] flex flex-col justify-between">
                <div>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10 text-green-600 dark:text-green-400">
                    <ClipboardList className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h2 className="mb-3 text-lg font-semibold text-foreground">Interactive Demo</h2>
                  <p className="mb-4">Select or drag incidents from the Bank into the corresponding Priority ranks.</p>
                </div>
                <PrioritisationAnimationPreview />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <h2 className="mb-3 text-lg font-semibold text-foreground">How to Decide the Priority Order</h2>
              <p>When deciding your order, consider:</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  'Urgency and seriousness',
                  'Whether it is happening now',
                  'Immediate risk to anyone involved',
                  'Vulnerability or welfare concerns',
                  'Threat, harm, or escalation',
                  'Risk to the wider public',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-lg bg-muted p-3 text-foreground dark:bg-white/5">
                    <Target className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Timer className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">Practice Questions</h2>
                </div>
                <p>Start with three practice questions. They help you get used to the format and are not scored.</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-600 dark:text-green-400">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">Live Assessment Questions</h2>
                </div>
                <p>After practice, you will complete 15 scored live questions. Each live question contains six incidents to rank.</p>
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">Step-by-Step Instructions</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  'Read the question',
                  'Read all six incidents',
                  'Identify the most urgent items',
                  'Identify less urgent items',
                  'Rank all six incidents',
                  'Review your order',
                  'Submit your answer',
                ].map((step, index) => (
                  <div key={step} className="rounded-lg bg-muted p-3 dark:bg-white/5">
                    <span className="font-semibold text-foreground">Step {index + 1}:</span> {step}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-border pt-8 dark:border-white/10 sm:flex-row">
            <Button size="lg" className="h-12" onClick={startPractice}>
              Start practice block
              <Play className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12"
              onClick={() => setPhase('landing')}
            >
              Back
            </Button>
          </div>
        </div>
      )}

      {phase === 'practice-round' && renderRound('practice')}
      {phase === 'final-round' && renderRound('final')}

      {phase === 'practice-review' && latestSnapshot && (
        <div className="mx-auto flex min-h-[520px] w-full flex-col justify-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground text-center">
            Practice round {latestSnapshot.roundNumber} complete
          </p>
          <p className="mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-3xl text-center">
            Next practice round
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground text-center">
            The next round will show a new queue of incidents. Keep placing the
            most urgent incident at the top.
          </p>
          <Button size="lg" className="mx-auto mt-8 h-12 px-8" onClick={continuePractice}>
            Continue practice
          </Button>
        </div>
      )}

      {phase === 'practice-complete' && (
        <div className="mx-auto flex min-h-[520px] w-full max-w-3xl flex-col justify-center text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Timer className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400 font-bold">
            Practice Round Complete
          </p>
          <p className="mt-3 text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            Prepare for Scored Live Assessment
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground border border-amber-500/20 bg-amber-500/5 p-4 rounded-xl shadow-sm">
            <span className="font-bold text-amber-600 dark:text-amber-400 block mb-1">WARNING:</span> You are about to start the live scored prioritisation assessment rounds. These rounds are timed and will count towards your final result. Ensure you are ready before clicking Continue.
          </p>
          <div className="mx-auto mt-7 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Risk first</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Prioritize immediate danger and vulnerability.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Read carefully</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Small details may change the urgency of a call.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Top to bottom</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Place the most urgent incident at number 1.
              </p>
            </div>
          </div>
          <Button size="lg" className="mx-auto mt-8 h-12 px-8" onClick={startFinal}>
            Continue to final block
          </Button>
        </div>
      )}

      {phase === 'submitting' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Final block complete
          </p>
          <p className="mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Submitting assessment
          </p>
          <p className="mt-4 max-w-md text-muted-foreground">
            Please keep this window open while your prioritisation assessment is
            prepared for submission.
          </p>
        </div>
      )}

      {phase === 'submitted' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </div>
          <p className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Assessment submitted
          </p>
          <p className="mt-4 max-w-md text-muted-foreground">
            {submitError
              ? submitError
              : 'Thank you. Your assessment has been submitted successfully. Please complete any remaining assessments or await further information from the Hiring Manager.'}
          </p>
          <Button variant="outline" className="mt-8 h-11 px-6" onClick={closeAssessment}>
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
            Close assessment
          </Button>
        </div>
      )}
      </div>
    </AssessmentGameShell>
  );
}
