import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Next Steps",
};

export default function CandidateNextStepsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline text-foreground">
          Next Steps
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          A simple guide to help you prepare and understand what happens after
          your assessments are complete.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl border-white/10 bg-white/[0.04] shadow-[0_24px_80px_rgba(2,6,23,0.2)]">
          <CardHeader>
            <CardTitle className="text-xl">Before you start</CardTitle>
            <CardDescription>
              Practical reminders for a smoother assessment session.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground/90">
            <p>Choose a quiet environment where you can focus properly.</p>
            <p>Use a reliable device and stable internet connection.</p>
            <p>Work through the assessments in the order that feels most comfortable to you.</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/[0.04] shadow-[0_24px_80px_rgba(2,6,23,0.2)]">
          <CardHeader>
            <CardTitle className="text-xl">After you submit</CardTitle>
            <CardDescription>
              What to expect once your responses have been completed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground/90">
            <p>Your assessments move into internal review by the hiring team.</p>
            <p>You will not see scoring or decision detail in the candidate portal.</p>
            <p>The team will contact you directly if they need anything further.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
