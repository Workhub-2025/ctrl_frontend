"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type AssessmentStep = "welcome" | "practice" | "review" | "live";

interface AssessmentFlowStepperProps {
  currentStep: AssessmentStep;
  hasPractice?: boolean;
}

export function AssessmentFlowStepper({
  currentStep,
  hasPractice = true,
}: AssessmentFlowStepperProps) {
  const steps = hasPractice
    ? [
        { id: "welcome", label: "Overview", desc: "Test details" },
        { id: "practice", label: "Practice Run", desc: "Unscored trial" },
        { id: "review", label: "Practice Review", desc: "How it works" },
        { id: "live", label: "Live Assessment", desc: "Assessed & scored" },
      ]
    : [
        { id: "welcome", label: "Overview", desc: "Test details" },
        { id: "live", label: "Live Assessment", desc: "Assessed & scored" },
      ];

  const getStepIndex = (stepId: string) => steps.findIndex((s) => s.id === stepId);
  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="w-full border-b border-border/60 bg-muted/10 py-4 dark:border-white/5 dark:bg-white/[0.01]">
      <div className="mx-auto max-w-5xl px-4">
        <div className="relative flex items-center justify-between">
          <div
            className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-border dark:bg-white/10"
            aria-hidden="true"
          >
            <div
              className="h-full bg-primary transition-[width] duration-500 ease-out"
              style={{
                width: `${
                  steps.length > 1
                    ? (Math.max(0, currentIndex) / (steps.length - 1)) * 100
                    : 100
                }%`,
              }}
            />
          </div>

          {steps.map((step, idx) => {
            const isCompleted = idx < currentIndex;
            const isActive = idx === currentIndex;

            return (
              <div
                key={step.id}
                className="relative z-10 flex flex-col items-center"
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-[border-color,background-color,box-shadow] duration-300",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    isActive &&
                      "border-primary bg-background text-primary shadow-[0_0_12px_rgba(99,102,241,0.25)] ring-4 ring-primary/10",
                    !isCompleted &&
                      !isActive &&
                      "border-border bg-background text-muted-foreground dark:border-white/10 dark:bg-card"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 stroke-[3]" />
                  ) : (
                    <span className="text-xs font-bold">{idx + 1}</span>
                  )}
                </div>

                <div className="absolute top-9 flex min-w-[120px] flex-col items-center text-center">
                  <span
                    className={cn(
                      "text-xs font-semibold tracking-tight",
                      isActive && "font-bold text-primary",
                      isCompleted && "text-foreground",
                      !isActive && !isCompleted && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="mt-0.5 hidden text-[10px] text-muted-foreground sm:inline">
                    {step.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="h-9" />
      </div>
    </div>
  );
}
