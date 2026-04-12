import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { candidateSupportLinks } from "@/components/dashboard/candidate-dashboard-data";

export const metadata = {
  title: "Help and Support",
};

export default function CandidateHelpSupportPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline text-foreground">
          Help & Support
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Use the support options below if you need technical help or want to
          contact the hiring team.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {candidateSupportLinks.map((item) => {
          const Icon = item.icon;

          return (
            <Card
              key={item.title}
              className="rounded-3xl border-white/10 bg-white/[0.04] shadow-[0_24px_80px_rgba(2,6,23,0.2)]"
            >
              <CardHeader className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {item.description}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild className="h-11 w-full rounded-xl">
                  <Link href={item.href}>{item.actionLabel}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-3xl border-white/10 bg-white/[0.035]">
        <CardHeader>
          <CardTitle className="text-xl">When to reach out</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground/90">
          <p>If a page freezes, audio fails, or your session is interrupted, raise an IT ticket first.</p>
          <p>If you need clarification on the process, timings, or next steps, contact the hiring manager.</p>
          <p>If something interrupts your assessment, stop and ask for guidance before retrying.</p>
        </CardContent>
      </Card>
    </div>
  );
}
