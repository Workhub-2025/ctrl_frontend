"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import { SecurePreflightModal } from "@/components/assessment";
import { cn } from "@/lib/utils";
import { portalCardClass } from "@/components/dashboard/portal/portal-design-tokens";

type AssessmentCardProps = Readonly<{
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  isCompleted?: boolean;
  isAvailable?: boolean;
  availableFromLabel?: string;
}>;

export function AssessmentCard({
  icon,
  title,
  description,
  href,
  isCompleted,
  isAvailable = true,
  availableFromLabel,
}: AssessmentCardProps) {
  const [showPreflight, setShowPreflight] = useState(false);

  return (
    <>
      <Card className={cn(
        portalCardClass,
        "flex flex-col rounded-3xl transition-transform duration-300 ease-in-out hover:-translate-y-1",
        isCompleted && "opacity-80"
      )}>
      <CardHeader className="flex flex-row items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <CardTitle className="font-headline text-lg leading-snug">
            {title}
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed text-muted-foreground">
            Skills Assessment
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-base leading-relaxed text-muted-foreground">{description}</p>
      </CardContent>
      <CardFooter>
          {isCompleted ? (
            <Button variant="secondary" className="h-11 w-full rounded-xl text-green-600 dark:text-green-500 bg-green-500/10 hover:bg-green-500/20" disabled>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Submitted
            </Button>
          ) : !isAvailable ? (
            <Button variant="secondary" className="h-11 w-full rounded-xl" disabled>
              {availableFromLabel ? `Opens ${availableFromLabel}` : "Not open yet"}
            </Button>
          ) : (
            <Button onClick={() => setShowPreflight(true)} className="h-11 w-full rounded-xl">
              Start Assessment <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
      <SecurePreflightModal 
        isOpen={showPreflight} 
        onClose={() => setShowPreflight(false)} 
        assessmentName={title} 
        href={href} 
      />
    </>
  );
}
