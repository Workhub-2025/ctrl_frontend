'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DragEvent, MouseEvent, PointerEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  ClipboardList,
  GripVertical,
  Loader2,
  LogOut,
  Play,
} from 'lucide-react';
import { AssessmentGameShell } from '@/components/assessment/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { closeAssessmentWindow } from '@/lib/assessment-completion';

type Incident = {
  id: string;
  type: string;
  location: string;
  risk: string;
  waitTime: string;
  details: string;
};

type PriorityRound = {
  id: string;
  title: string;
  incidents: Incident[];
};

type PrioritizationContent = {
  practiceRounds: PriorityRound[];
  finalRounds: PriorityRound[];
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
  roundNumber: number;
  order: string[];
};

const CONTENT_URL = '/assessment-content/prioritization.json';

type PrioritySlot = string | null;

const fallbackContent: PrioritizationContent = {
  practiceRounds: [
    {
      id: 'fallback-practice',
      title: 'Practice round',
      incidents: [
        {
          id: 'P-01',
          type: 'Road traffic collision',
          location: 'Main road junction',
          risk: 'Possible trapped person',
          waitTime: '02:00',
          details: 'Traffic is moving around the scene.',
        },
        {
          id: 'P-02',
          type: 'Noise complaint',
          location: 'Residential block',
          risk: 'No immediate danger',
          waitTime: '08:00',
          details: 'Caller reports shouting and loud music.',
        },
        {
          id: 'P-03',
          type: 'Missing child',
          location: 'Shopping centre',
          risk: 'Young child separated from parent',
          waitTime: '01:00',
          details: 'Last seen near main exit.',
        },
        {
          id: 'P-04',
          type: 'Suspicious vehicle',
          location: 'Library car park',
          risk: 'Occupants watching staff entrance',
          waitTime: '05:00',
          details: 'No weapons seen.',
        },
      ],
    },
  ],
  finalRounds: [],
};

export default function PrioritizationTest() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('landing');
  const [content, setContent] = useState<PrioritizationContent>(fallbackContent);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [finalIndex, setFinalIndex] = useState(0);
  const [prioritySlots, setPrioritySlots] = useState<PrioritySlot[]>([]);
  const [snapshots, setSnapshots] = useState<RoundSnapshot[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [pressedIncidentId, setPressedIncidentId] = useState<string | null>(null);
  const [draggingIncidentId, setDraggingIncidentId] = useState<string | null>(null);

  const activeMode: 'practice' | 'final' =
    phase === 'final-round' || phase === 'submitting' || phase === 'submitted'
      ? 'final'
      : 'practice';
  const activeRounds =
    activeMode === 'practice' ? content.practiceRounds : content.finalRounds;
  const activeIndex = activeMode === 'practice' ? practiceIndex : finalIndex;
  const activeRound = activeRounds[activeIndex] ?? activeRounds[0] ?? fallbackContent.practiceRounds[0];
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
    content.finalRounds.length > 0
      ? ((finalIndex + 1) / content.finalRounds.length) * 100
      : 0;

  useEffect(() => {
    let cancelled = false;

    fetch(CONTENT_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Unable to load prioritization content');
        }
        return response.json() as Promise<PrioritizationContent>;
      })
      .then((loadedContent) => {
        if (
          !cancelled &&
          loadedContent.practiceRounds?.length &&
          loadedContent.finalRounds?.length
        ) {
          setContent(loadedContent);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setContent(fallbackContent);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const startPractice = useCallback(() => {
    const firstRound = content.practiceRounds[0] ?? fallbackContent.practiceRounds[0];
    setPracticeIndex(0);
    setFinalIndex(0);
    setSnapshots([]);
    setPrioritySlots(Array(firstRound.incidents.length).fill(null));
    setSelectedIncidentId(null);
    setPressedIncidentId(null);
    setDraggingIncidentId(null);
    setPhase('practice-round');
  }, [content.practiceRounds]);

  const startFinal = useCallback(() => {
    const firstRound = content.finalRounds[0];
    if (!firstRound) return;

    setFinalIndex(0);
    setPrioritySlots(Array(firstRound.incidents.length).fill(null));
    setSelectedIncidentId(null);
    setPressedIncidentId(null);
    setDraggingIncidentId(null);
    setPhase('final-round');
  }, [content.finalRounds]);

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
      roundNumber: practiceIndex + 1,
      order: placedIncidentIds,
    };
    setSnapshots((currentSnapshots) => [...currentSnapshots, snapshot]);

    if (practiceIndex >= content.practiceRounds.length - 1) {
      setPhase('practice-complete');
      return;
    }

    setPhase('practice-review');
  };

  const continuePractice = () => {
    const nextIndex = practiceIndex + 1;
    const nextRound = content.practiceRounds[nextIndex];
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
      roundNumber: finalIndex + 1,
      order: placedIncidentIds,
    };
    setSnapshots((currentSnapshots) => [...currentSnapshots, snapshot]);

    if (finalIndex >= content.finalRounds.length - 1) {
      setPhase('submitting');
      return;
    }

    const nextIndex = finalIndex + 1;
    const nextRound = content.finalRounds[nextIndex];
    setFinalIndex(nextIndex);
    setPrioritySlots(Array(nextRound.incidents.length).fill(null));
    setSelectedIncidentId(null);
    setPressedIncidentId(null);
    setDraggingIncidentId(null);
  };

  useEffect(() => {
    if (phase !== 'submitting') return;

    const timerId = window.setTimeout(() => {
      setPhase('submitted');
    }, 2600);

    return () => window.clearTimeout(timerId);
  }, [phase]);

  const renderRound = (mode: 'practice' | 'final') => {
    const isFinal = mode === 'final';
    const roundNumber = isFinal ? finalIndex + 1 : practiceIndex + 1;
    const totalRounds = isFinal ? content.finalRounds.length : content.practiceRounds.length;
    const hasActiveCard = Boolean(selectedIncidentId || draggingIncidentId);
    const placedCount = placedIncidentIds.length;

    return (
      <div className="mx-auto flex min-h-[560px] w-full max-w-[1480px] flex-col justify-center">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {isFinal ? 'Final submission' : 'Practice'}
              </p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {activeRound.title}
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Drag each incident from the bank into the priority list. Highest
                priority belongs in position 1. You can also click a card, then
                click a slot or another placed card to move it.
              </p>
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
                  <div
                    key={incident.id}
                    draggable
                    onDragStart={(event) => handleDragStart(event, incident.id)}
                    onDragEnd={handleDragEnd}
                    onClick={(event) => handleCardClick(event, incident.id)}
                    onPointerDown={(event) => handleCardPointerDown(event, incident.id)}
                    onPointerUp={handleCardPointerUp}
                    onPointerCancel={handleCardPointerUp}
                    onPointerLeave={handleCardPointerUp}
                    className={[
                      'ctrl-priority-card cursor-grab overflow-hidden rounded-xl border bg-gradient-to-br from-background via-background to-muted/30 p-0 shadow-[0_14px_34px_rgba(2,6,23,0.14)] transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_18px_40px_rgba(2,6,23,0.2)] active:cursor-grabbing dark:from-[#0d1320] dark:via-[#080d18] dark:to-[#050811]',
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
                        <GripVertical className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{incident.id}</Badge>
                            <p className="font-semibold text-foreground">{incident.type}</p>
                          </div>
                          <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                            <p>
                              <span className="font-medium text-foreground">Location:</span>{' '}
                              {incident.location}
                            </p>
                            <p>
                              <span className="font-medium text-foreground">Waiting:</span>{' '}
                              {incident.waitTime}
                            </p>
                            <p>
                              <span className="font-medium text-foreground">Risk:</span>{' '}
                              {incident.risk}
                            </p>
                            <p>
                              <span className="font-medium text-foreground">Details:</span>{' '}
                              {incident.details}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
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

                return (
                  <div
                    key={`${activeRound.id}-slot-${index}`}
                    onClick={() => handleSlotClick(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDropOnPriority(event, index)}
                    className={[
                      'min-h-[118px] rounded-xl border p-3 transition',
                      incident
                        ? 'border-border bg-background/70 dark:border-white/10 dark:bg-[#070b13]/80'
                        : 'border-dashed border-border bg-muted/20 dark:border-white/10 dark:bg-white/[0.02]',
                      !incident && hasActiveCard ? 'ctrl-priority-slot-glow cursor-copy' : '',
                      selectedIncidentId && incident?.id !== selectedIncidentId
                        ? 'hover:border-primary/60 hover:ring-1 hover:ring-primary/20'
                        : '',
                    ].join(' ')}
                  >
                    {incident ? (
                      <div
                        draggable
                        onDragStart={(event) => handleDragStart(event, incident.id)}
                        onDragEnd={handleDragEnd}
                        onClick={(event) => handleRankedCardClick(event, incident.id, index)}
                        onPointerDown={(event) => handleCardPointerDown(event, incident.id)}
                        onPointerUp={handleCardPointerUp}
                        onPointerCancel={handleCardPointerUp}
                        onPointerLeave={handleCardPointerUp}
                        className={[
                          'ctrl-priority-card -m-1 grid cursor-grab gap-3 overflow-hidden rounded-xl bg-gradient-to-br from-background via-background to-muted/30 p-1 active:cursor-grabbing md:grid-cols-[52px_1fr] dark:from-[#0d1320] dark:via-[#080d18] dark:to-[#050811]',
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
                              {incident.type}
                            </p>
                          </div>
                          <div className="mt-2 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                            <p>
                              <span className="font-medium text-foreground">Location:</span>{' '}
                              {incident.location}
                            </p>
                            <p>
                              <span className="font-medium text-foreground">Waiting:</span>{' '}
                              {incident.waitTime}
                            </p>
                            <p>
                              <span className="font-medium text-foreground">Risk:</span>{' '}
                              {incident.risk}
                            </p>
                            <p>
                              <span className="font-medium text-foreground">Details:</span>{' '}
                              {incident.details}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full min-h-[92px] items-center justify-center rounded-lg text-sm text-muted-foreground">
                        Drop priority {index + 1} here
                      </div>
                    )}
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

  return (
    <AssessmentGameShell
      icon={ClipboardList}
      title="Prioritization Assessment"
      eyebrow="CTRL assessment"
      status={
        phase === 'final-round'
          ? `Final round ${finalIndex + 1}/10`
          : phase === 'practice-round'
            ? `Practice round ${practiceIndex + 1}/3`
            : 'Incident queue'
      }
    >
      {phase === 'landing' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ClipboardList className="h-8 w-8" />
          </div>
          <p className="max-w-2xl text-2xl font-semibold leading-tight tracking-normal text-foreground sm:text-3xl">
            Prioritization Assessment
          </p>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Review incoming incidents and place them into the order you would
            handle them. Highest priority belongs at the top.
          </p>
          <Button className="mt-8 h-12 px-7" size="lg" onClick={() => setPhase('rules')}>
            Start Assessment
            <Play className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {phase === 'rules' && (
        <div className="mx-auto flex min-h-[520px] w-full max-w-3xl flex-col justify-center">
          <Badge className="mb-5 w-fit" variant="secondary">
            How this test works
          </Badge>
          <p className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            You will complete one practice block, then one final submission block.
          </p>
          <div className="mt-6 grid gap-3 text-sm leading-6 text-muted-foreground sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Practice block</p>
              <p className="mt-1">3 rounds with 4 incidents in each round.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Final block</p>
              <p className="mt-1">10 rounds with 6 incidents in each round.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Drag and place</p>
              <p className="mt-1">Drag incidents into the priority list, with the highest priority at number 1.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Judgement</p>
              <p className="mt-1">Consider risk to life, vulnerability, hazards, urgency, and delay.</p>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-12" onClick={startPractice}>
              Start practice block
              <Play className="ml-2 h-4 w-4" />
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
        <div className="mx-auto flex min-h-[520px] w-full max-w-3xl flex-col justify-center text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Practice round {latestSnapshot.roundNumber} complete
          </p>
          <p className="mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Next practice round
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
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
            <ClipboardList className="h-7 w-7" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Practice complete
          </p>
          <p className="mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Final submission block next
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Take a break before pressing continue. The final block contains 10
            rounds with 6 incidents per round, and no results are shown at the end.
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
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Final block complete
          </p>
          <p className="mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Submitting assessment
          </p>
          <p className="mt-4 max-w-md text-muted-foreground">
            Please keep this window open while your prioritization assessment is
            prepared for submission.
          </p>
        </div>
      )}

      {phase === 'submitted' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Assessment submitted
          </p>
          <p className="mt-4 max-w-md text-muted-foreground">
            Thank you. Your assessment has been submitted successfully. Please
            complete any remaining assessments in My Assessments. If all
            sections are complete, await further information from the Hiring
            Manager.
          </p>
          <Button variant="outline" className="mt-8 h-11 px-6" onClick={closeAssessment}>
            <LogOut className="mr-2 h-4 w-4" />
            Close assessment
          </Button>
        </div>
      )}
    </AssessmentGameShell>
  );
}
