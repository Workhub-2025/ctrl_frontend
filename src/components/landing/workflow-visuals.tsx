"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  ListChecks,
  Activity,
  Trophy,
  KeyRound,
  CalendarClock,
  MapPin,
  Lock,
  Link2,
  Flag,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type WorkflowVisualVariant =
  // Hiring manager flow
  | "campaign"
  | "sessions"
  | "tracking"
  | "ranking"
  // Candidate flow
  | "access"
  | "schedule"
  | "modules"
  | "outcome";

const SHELL =
  "w-full aspect-video rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#070707]/80 backdrop-blur-sm overflow-hidden relative p-5 flex flex-col";

const HEADER =
  "flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4";

function MeterBar({
  label,
  value,
  accent,
  reduceMotion,
}: {
  label: string;
  value: number;
  accent: string;
  reduceMotion: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-xs text-slate-600 dark:text-slate-300">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
        <motion.div
          className={cn("h-full rounded-full", accent)}
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-[10px] text-slate-500 dark:text-slate-400">
        {value}
      </span>
    </div>
  );
}

export function WorkflowVisual({
  variant,
  reduceMotion = false,
}: {
  variant: WorkflowVisualVariant;
  reduceMotion?: boolean;
}) {
  switch (variant) {
    // ---------- Hiring manager flow ----------
    case "campaign":
      return (
        <div className={SHELL}>
          <div className={HEADER}>
            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" /> Campaign Builder
          </div>
          <div className="flex flex-1 flex-col justify-center gap-3">
            <div className="flex flex-wrap gap-1.5">
              {["Call Simulation", "Prioritisation", "Situational Judgement", "Typing v3"].map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400"
                >
                  {p}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-3 py-2 font-mono text-[10px] text-slate-500 dark:text-slate-400">
              <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">ctrl.app/invite/9A2X</span>
              <span className="ml-auto shrink-0 rounded-md border border-slate-200 dark:border-white/10 px-2 py-0.5 text-slate-600 dark:text-slate-300">
                Copy
              </span>
            </div>
          </div>
        </div>
      );

    case "sessions":
      return (
        <div className={SHELL}>
          <div className={HEADER}>
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> Sessions
          </div>
          <div className="flex flex-1 flex-col justify-center gap-2.5">
            {[
              { role: "Dispatch Operator", mode: "Remote", meta: "Tomorrow · 09:00", status: "Locked", locked: true },
              { role: "Call Handler", mode: "In-person", meta: "Control Room B", status: "Scheduled", locked: false },
            ].map((s) => (
              <div key={s.role} className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-900 dark:text-white">{s.role}</span>
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                      s.locked
                        ? "border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                    )}
                  >
                    {s.locked && <Lock className="h-3 w-3" aria-hidden="true" />}
                    {s.status}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {s.mode === "In-person" && <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />}
                  {s.mode} · {s.meta}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "tracking":
      return (
        <div className={SHELL}>
          <div className={HEADER}>
            <Activity className="h-3.5 w-3.5" aria-hidden="true" /> Live Sessions
          </div>
          <div className="flex flex-1 flex-col justify-center gap-3">
            {[
              { name: "Candidate A", pct: 100, status: "Score 92", done: true },
              { name: "Candidate B", pct: 60, status: "In progress", done: false },
              { name: "Candidate C", pct: 25, status: "In progress", done: false },
            ].map((r) => (
              <div key={r.name} className="flex items-center gap-3">
                <span className="w-24 shrink-0 truncate text-xs text-slate-600 dark:text-slate-300">{r.name}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <motion.div
                    className={cn("h-full rounded-full", r.done ? "bg-emerald-500" : "bg-cyan-500")}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${r.pct}%` }}
                    viewport={{ once: true }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <span
                  className={cn(
                    "w-20 shrink-0 text-right font-mono text-[9px] uppercase tracking-wider",
                    r.done ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      );

    case "ranking":
      return (
        <div className={SHELL}>
          <div className={HEADER}>
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Compare &amp; Progress
          </div>
          <div className="flex flex-1 flex-col justify-center gap-3">
            {[
              { name: "Candidate A", score: 92, accent: "bg-emerald-500" },
              { name: "Candidate B", score: 78, accent: "bg-cyan-500" },
              { name: "Candidate C", score: 64, accent: "bg-slate-400 dark:bg-white/30" },
            ].map((c) => (
              <MeterBar
                key={c.name}
                label={c.name}
                value={c.score}
                accent={c.accent}
                reduceMotion={reduceMotion}
              />
            ))}
          </div>
        </div>
      );

    // ---------- Candidate flow ----------
    case "access":
      return (
        <div className={SHELL}>
          <div className={HEADER}>
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> Access Code
          </div>
          <div className="flex flex-1 flex-col justify-center gap-3">
            <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-4 py-3 text-center font-mono text-lg font-medium uppercase tracking-[0.3em] text-slate-900 dark:text-white">
              CTRL-9A2X
            </div>
            <div className="flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Verified · Agency workspace
            </div>
          </div>
        </div>
      );

    case "schedule":
      return (
        <div className={SHELL}>
          <div className={HEADER}>
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> Your Session
          </div>
          <div className="flex flex-1 flex-col justify-center">
            <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-slate-900 dark:text-white">Dispatch Operator</span>
                <span className="flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <Lock className="h-3 w-3" aria-hidden="true" /> Locked
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Unlocks tomorrow · 09:00
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Control Room B · View map
              </div>
            </div>
          </div>
        </div>
      );

    case "modules":
      return (
        <div className={SHELL}>
          <div className={HEADER}>
            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" /> Assessment Modules
          </div>
          <div className="flex flex-1 flex-col justify-center gap-2.5">
            {[
              { name: "Typing Assessment", done: true },
              { name: "Situational Judgement", done: true },
              { name: "Prioritisation", done: false },
              { name: "Call Simulation", done: false },
            ].map((m) => (
              <div key={m.name} className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    m.done ? "border-cyan-500 bg-cyan-500/20" : "border-slate-300 dark:border-white/20"
                  )}
                >
                  {m.done && <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    m.done ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"
                  )}
                >
                  {m.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      );

    case "outcome":
      return (
        <div className={SHELL}>
          <div className={HEADER}>
            <Flag className="h-3.5 w-3.5" aria-hidden="true" /> Outcome
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Progressed — shared with the hiring team</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {[
                { label: "Completed", active: false },
                { label: "Progressed", active: true },
                { label: "Unsuccessful", active: false },
              ].map((s) => (
                <span
                  key={s.label}
                  className={cn(
                    "rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider",
                    s.active
                      ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400"
                  )}
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
