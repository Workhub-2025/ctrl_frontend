"use client";

import { Check } from "lucide-react";

export type AssessmentStep = "welcome" | "practice" | "review" | "live";

interface AssessmentFlowStepperProps {
  currentStep: AssessmentStep;
  hasPractice?: boolean;
}

export function AssessmentFlowStepper({
  currentStep,
  hasPractice = true,
}: AssessmentFlowStepperProps) {
  // Define steps dynamically based on whether there is a practice run
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
    <div className="w-full py-4 border-b border-border bg-muted/10 dark:border-white/5 dark:bg-white/[0.01]">
      <div className="mx-auto max-w-5xl px-4">
        <div className="relative flex items-center justify-between">
          {/* Timeline Connector Line */}
          <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-slate-200 dark:bg-white/10" aria-hidden="true">
            <div
              className="h-full bg-primary transition-all duration-500 ease-in-out"
              style={{
                width: `${
                  steps.length > 1
                    ? (Math.max(0, currentIndex) / (steps.length - 1)) * 100
                    : 100
                }%`,
              }}
            />
          </div>

          {/* Stepper Nodes */}
          {steps.map((step, idx) => {
            const isCompleted = idx < currentIndex;
            const isActive = idx === currentIndex;
            const isUpcoming = idx > currentIndex;

            return (
              <div
                key={step.id}
                className="relative flex flex-col items-center z-10"
              >
                {/* Node Circle */}
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isCompleted
                      ? "border-primary bg-primary text-white"
                      : isActive
                        ? "border-primary bg-background text-primary shadow-[0_0_12px_rgba(59,130,246,0.3)] ring-4 ring-primary/10"
                        : "border-slate-200 bg-background text-slate-400 dark:border-white/10 dark:bg-[#070b13]"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 stroke-[3]" />
                  ) : (
                    <span className="text-xs font-bold">{idx + 1}</span>
                  )}
                </div>

                {/* Labels */}
                <div className="absolute top-9 flex flex-col items-center text-center min-w-[120px]">
                  <span
                    className={`text-xs font-semibold tracking-tight ${
                      isActive
                        ? "text-primary font-bold"
                        : isCompleted
                          ? "text-foreground"
                          : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="hidden sm:inline text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {step.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {/* Padding under label row */}
        <div className="h-9" />
      </div>
    </div>
  );
}
