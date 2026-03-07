import { AssessmentCard } from "@/components/dashboard/assessment-card";
import { Keyboard, Phone, ClipboardCheck } from "lucide-react";

export const metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="section-spacing text-center">
        <h1 className="text-responsive-3xl font-bold font-headline title-adaptive">
          Welcome, Candidate
        </h1>
        <p className="text-adaptive-secondary text-responsive-base leading-relaxed">
          Please select an assessment to begin. Complete them in any order.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AssessmentCard
          icon={<Keyboard className="h-8 w-8" />}
          title="Typing Test"
          description="Evaluate your typing speed and accuracy under timed conditions. This test consists of one practice round and three graded rounds."
          href="/demo/typing"
        />
        <AssessmentCard
          icon={<Phone className="h-8 w-8" />}
          title="Call Simulation"
          description="Listen to simulated emergency calls and accurately record critical information. This test includes three different call scenarios."
          href="/demo/call-simulation"
        />
        <AssessmentCard
          icon={<ClipboardCheck className="h-8 w-8" />}
          title="Situational Judgement"
          description="Assess your decision-making skills with a series of multiple-choice and text-based questions based on real-world emergency scenarios."
          href="/demo/situational-judgement"
        />
      </div>
    </div>
  );
}
