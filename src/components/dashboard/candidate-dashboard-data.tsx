import {
  ClipboardCheck,
  Headphones,
  Keyboard,
  LifeBuoy,
  ListOrdered,
  Mail,
  Phone,
  ShieldCheck,
  Ticket,
  KeyRound,
  type LucideIcon,
} from "lucide-react";

export const completionLabels: Record<string, string> = {
  typing: "Typing Assessment",
  "call-simulation": "Call Simulation",
  "situational-judgement": "Situational Judgement Assessment",
  prioritisation: "Prioritisation Judgement Assessment",
};

export const candidateAssessmentItems = [
  {
    icon: Keyboard,
    title: "Typing Assessment",
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
    title: "Situational Judgement Assessment",
    description:
      "Respond to realistic scenarios that assess judgement, prioritisation, and decision-making.",
    href: "/assessment/situational-judgement",
    duration: "15-20 min",
    status: "Available now",
  },
  {
    icon: ListOrdered,
    title: "Prioritisation Judgement Assessment",
    description:
      "Rank incident sets from highest to lowest priority to show operational risk judgement.",
    href: "/assessment/prioritisation",
    duration: "Untimed",
    status: "Available now",
  },
] as const;

export const candidateSupportLinks: Array<{
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  actionLabel: string;
  isContactForm?: boolean;
}> = [
  {
    title: "Raise a Support Ticket",
    description:
      "Use our smart ticketing system to report technical issues or ask questions using presets.",
    href: "/candidate-dashboard/help-support?action=new-ticket",
    icon: Ticket,
    actionLabel: "Raise Ticket",
  },
  {
    title: "Contact Hiring Manager",
    description:
      "Use this for questions about your allocated assessment or the recruitment process.",
    href: "#",
    icon: Mail,
    actionLabel: "Send Message",
    isContactForm: true,
  },
];

export const candidateGuidanceItems: Array<{
  title: string;
  body: string;
  icon: LucideIcon;
}> = [
  {
    title: "Access Code",
    body: "Your assessments are linked using your unique Access Code. The code is single-use and connects you to the correct Campaign.",
    icon: KeyRound,
  },
  {
    title: "Secure review",
    body: "Your responses are submitted securely and reviewed internally by the hiring team after completion.",
    icon: ShieldCheck,
  },
];
