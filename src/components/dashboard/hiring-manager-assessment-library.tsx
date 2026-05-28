"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BrainCircuit,
  Headphones,
  PlayCircle,
  SlidersHorizontal,
  TimerReset,
} from "lucide-react";
import { useState } from "react";
import type { HiringManagerAssessment } from "@/services/hiring-manager-assessments.service";

type HiringManagerAssessmentLibraryProps = {
  assessments: HiringManagerAssessment[];
};

const iconByKey = {
  typing: TimerReset,
  "call-simulation": Headphones,
  "situational-judgement": SlidersHorizontal,
  prioritization: BrainCircuit,
  default: BrainCircuit,
} satisfies Record<HiringManagerAssessment["iconKey"], typeof BrainCircuit>;

export function HiringManagerAssessmentLibrary({
  assessments,
}: HiringManagerAssessmentLibraryProps) {
  const [selected, setSelected] = useState<HiringManagerAssessment | null>(null);

  if (assessments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-white/10 bg-[#0b1220] p-6 text-sm leading-6 text-slate-300">
        No active assessments are currently available from Strapi. Once Nelson
        enables or seeds the assessment records, they will appear here
        automatically.
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 xl:grid-cols-2">
        {assessments.map((assessment) => {
          const Icon = iconByKey[assessment.iconKey] ?? BrainCircuit;
          return (
            <Card
              key={assessment.id}
              className="rounded-lg border border-white/10 bg-[#0b1220] shadow-none"
            >
              <CardHeader className="space-y-3 pb-3">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-sky-400/20 bg-sky-400/10 text-sky-200">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Badge className="rounded-md border-white/10 bg-white/5 text-xs text-slate-200 hover:bg-white/5">
                      {assessment.duration}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <CardTitle className="break-words text-base leading-snug text-white">
                    {assessment.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-6 text-slate-400">
                    {assessment.summary}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {assessment.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-slate-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="h-9 rounded-md border-white/10 bg-white/[0.02] px-3 text-sm text-slate-100 hover:bg-white/[0.05]"
                  onClick={() => setSelected(assessment)}
                >
                  View more
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl rounded-lg border border-white/10 bg-[#08101d] p-0 text-white shadow-[0_30px_120px_rgba(2,6,23,0.65)]">
          {selected && (
            <div className="overflow-hidden rounded-lg">
              <div className="border-b border-white/10 bg-[#0b1220] p-6">
                <DialogHeader className="space-y-3 text-left">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className="rounded-md border-sky-400/20 bg-sky-400/10 text-xs text-sky-100 hover:bg-sky-400/10">
                      {selected.duration}
                    </Badge>
                    <Badge className="rounded-md border-white/10 bg-white/5 text-xs text-slate-200 hover:bg-white/5">
                      {selected.slug}
                    </Badge>
                  </div>
                  <DialogTitle className="text-2xl font-semibold text-white">
                    {selected.title}
                  </DialogTitle>
                  <DialogDescription className="max-w-2xl text-sm leading-6 text-slate-300">
                    {selected.summary}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="grid gap-5 p-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-5">
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-3 flex items-center gap-3 text-slate-200">
                      <PlayCircle className="h-4 w-4 text-sky-300" />
                      <p className="text-xs font-medium uppercase text-slate-300">
                        Video demo
                      </p>
                    </div>
                    <div className="flex min-h-44 items-center justify-center rounded-md border border-dashed border-white/10 bg-[#050b14] p-4 text-center text-sm leading-6 text-slate-400">
                      {selected.videoLabel}
                      <br />
                      Video module placeholder for the assessment walkthrough.
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs font-medium uppercase text-slate-300">
                      What Strapi provides
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selected.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-slate-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-2 text-xs leading-5 text-slate-400">
                      <p>Slug: {selected.slug}</p>
                      <p>Attempts: {selected.maxAttempts ?? "Configured by backend"}</p>
                      <p>
                        Passing score:{" "}
                        {selected.passingScore === null
                          ? "Configured by backend"
                          : `${selected.passingScore}%`}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs font-medium uppercase text-slate-300">
                      Why it matters
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {selected.whyItMatters}
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
                    Remote and premium delivery can be permission-locked later
                    without changing the assessment definition coming from Strapi.
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
