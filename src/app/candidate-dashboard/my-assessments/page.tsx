import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { candidateAssessmentItems } from "@/components/dashboard/candidate-dashboard-data";

export const metadata = {
  title: "My Assessments",
};

export default function CandidateMyAssessmentsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline text-foreground">
          My Assessments
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          All assessment sections available to you are listed below.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {candidateAssessmentItems.map((assessment) => {
          const Icon = assessment.icon;

          return (
            <Card
              key={assessment.title}
              className="rounded-3xl border-white/10 bg-white/[0.04] shadow-[0_24px_80px_rgba(2,6,23,0.22)]"
            >
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <Badge variant="outline">{assessment.duration}</Badge>
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-xl">{assessment.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {assessment.description}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-muted-foreground/90">
                  {assessment.status}
                </div>
                <Button asChild className="h-11 w-full rounded-xl">
                  <Link href={assessment.href}>
                    Start assessment
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
