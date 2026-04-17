"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LucideIcon } from "lucide-react";

/**
 * Props for the SimulatedAssessmentPlaceholder component.
 */
interface SimulatedAssessmentPlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  completionKey: string;
}

/**
 * SimulatedAssessmentPlaceholder Component
 * 
 * A reusable UI component for simulated tests currently under development.
 * Handles the mocked completion logic, including removing the secure lock
 * and properly redirecting or closing the secure pop-out window.
 * 
 * @param {SimulatedAssessmentPlaceholderProps} props - Configuration for the placeholder display.
 */
export function SimulatedAssessmentPlaceholder({
  icon: Icon,
  title,
  description,
  completionKey,
}: SimulatedAssessmentPlaceholderProps) {
  const router = useRouter();

  /**
   * handleComplete
   * Simulates finishing an assessment. Clears the local storage lock and routes back.
   */
  const handleComplete = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("ctrl_secure_lock");
      if (window.opener) {
        window.opener.location.href = `/candidate-dashboard?completed=${completionKey}`;
        window.close();
      }
    }
    router.push(`/candidate-dashboard?completed=${completionKey}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in duration-500">
      <div className="h-20 w-20 bg-primary/10 text-primary flex items-center justify-center rounded-3xl">
        <Icon className="h-10 w-10" />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-bold font-headline text-foreground">{title}</h2>
        <p className="text-muted-foreground max-w-md mx-auto text-lg">{description}</p>
      </div>
      <Button onClick={handleComplete} size="lg" className="h-12 px-8 text-lg rounded-xl">
        Simulate Completion
      </Button>
    </div>
  );
}