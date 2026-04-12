import {
  ClipboardCheck,
  Headphones,
  Keyboard,
  LifeBuoy,
  Mail,
  Phone,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export const completionLabels: Record<string, string> = {
  typing: "Typing Test",
  "call-simulation": "Call Simulation",
  "situational-judgement": "Situational Judgement",
};

export const candidateAssessmentItems = [
  {
    icon: Keyboard,
    title: "Typing Test",
    description:
      "Complete a timed typing exercise designed to assess speed and accuracy.",
    href: "/assessment/typing",
    duration: "10-15 min",
    status: "Available now",
  },
  {
    icon: Phone,
    title: "Call Simulation",
    description:
      "Listen to a simulated call and record the key details clearly and accurately.",
    href: "/assessment/call-simulation",
    duration: "10 min",
    status: "Available now",
  },
  {
    icon: ClipboardCheck,
    title: "Situational Judgement",
    description:
      "Respond to realistic scenarios that assess judgement, prioritisation, and decision-making.",
    href: "/assessment/situational-judgement",
    duration: "15-20 min",
    status: "Available now",
  },
] as const;

export const candidateSupportLinks: Array<{
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  actionLabel: string;
}> = [
  {
    title: "Raise an IT ticket",
    description:
      "Use this if audio does not play, the page freezes, or your session is interrupted.",
    href: "mailto:support@ctrl.local?subject=CTRL%20IT%20Support%20Ticket",
    icon: LifeBuoy,
    actionLabel: "Contact IT",
  },
  {
    title: "Contact hiring manager",
    description:
      "Use this for questions about scheduling, the process, or what happens after completion.",
    href: "mailto:hiring@ctrl.local?subject=CTRL%20Candidate%20Query",
    icon: Mail,
    actionLabel: "Email hiring manager",
  },
];

export const candidateGuidanceItems: Array<{
  title: string;
  body: string;
  icon: LucideIcon;
}> = [
  {
    title: "Quiet environment",
    body: "Choose a calm space where you can focus without interruptions, especially for the call simulation.",
    icon: Headphones,
  },
  {
    title: "Secure review",
    body: "Your responses are submitted securely and reviewed internally by the hiring team after completion.",
    icon: ShieldCheck,
  },
];
