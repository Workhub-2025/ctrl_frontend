import {
  AlertTriangle,
  BookOpen,
  BrainCircuit,
  ClipboardList,
  Clock3,
  Headphones,
  LayoutPanelTop,
  Lock,
  PhoneCall,
  SlidersHorizontal,
  TimerReset,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type HiringManagerCandidate = {
  id: string;
  name: string;
  role: string;
  completion: number;
  status: "Not started" | "In progress" | "Completed" | "Report ready";
  lastActivity: string;
};

export type HiringManagerCampaign = {
  id: string;
  name: string;
  role: string;
  status: "Live" | "Configured" | "Draft";
  deliveryMode: "In-person" | "Remote" | "Hybrid";
  premiumLocked?: boolean;
  completion: number;
  candidateCount: number;
  sessions: number;
  assessmentStack: string[];
  nextMilestone: string;
  candidates: HiringManagerCandidate[];
};

export type HiringManagerSession = {
  id: string;
  campaign: string;
  type: "In-person" | "Remote";
  premiumLocked?: boolean;
  status: "Scheduled" | "Ready to issue" | "Live" | "Closed";
  date: string;
  location: string;
  candidateCount: number;
  accessMode: string;
  accessValue: string;
};

export type AssessmentLibraryItem = {
  id: string;
  title: string;
  summary: string;
  duration: string;
  skills: string[];
  whyItMatters: string;
  videoLabel: string;
  icon: LucideIcon;
  premiumLocked?: boolean;
};

export const hiringManagerStats = [
  {
    label: "Live campaigns",
    value: "4",
    meta: "2 ready to launch",
    icon: LayoutPanelTop,
  },
  {
    label: "Candidates in progress",
    value: "38",
    meta: "12 active today",
    icon: ClipboardList,
  },
  {
    label: "Reports ready",
    value: "16",
    meta: "Awaiting review",
    icon: Trophy,
  },
  {
    label: "Attention needed",
    value: "3",
    meta: "Stalled or expired",
    icon: AlertTriangle,
  },
];

export const hiringManagerCampaigns: HiringManagerCampaign[] = [
  {
    id: "CMP-2401",
    name: "MetCC Spring Intake",
    role: "Emergency Call Handler",
    status: "Live",
    deliveryMode: "In-person",
    completion: 72,
    candidateCount: 24,
    sessions: 3,
    assessmentStack: [
      "Typing Test",
      "Call Simulation",
      "Situational Judgement",
    ],
    nextMilestone: "12 reports ready",
    candidates: [
      {
        id: "C-102",
        name: "Aisha Rahman",
        role: "Emergency Call Handler",
        completion: 100,
        status: "Report ready",
        lastActivity: "Completed 32 mins ago",
      },
      {
        id: "C-117",
        name: "Daniel Brooks",
        role: "Emergency Call Handler",
        completion: 66,
        status: "In progress",
        lastActivity: "Typing and SJT done",
      },
      {
        id: "C-131",
        name: "Lauren Patel",
        role: "Emergency Call Handler",
        completion: 0,
        status: "Not started",
        lastActivity: "Code issued yesterday",
      },
    ],
  },
  {
    id: "CMP-2402",
    name: "Specialist Uplift",
    role: "Dispatch Specialist",
    status: "Configured",
    deliveryMode: "Remote",
    premiumLocked: true,
    completion: 0,
    candidateCount: 18,
    sessions: 1,
    assessmentStack: [
      "Typing Test",
      "Prioritisation Assessment",
      "Psychometric Assessment",
    ],
    nextMilestone: "Remote locked",
    candidates: [
      {
        id: "C-202",
        name: "Megan Ford",
        role: "Dispatch Specialist",
        completion: 0,
        status: "Not started",
        lastActivity: "Invite staged",
      },
      {
        id: "C-205",
        name: "Tom Lewis",
        role: "Dispatch Specialist",
        completion: 0,
        status: "Not started",
        lastActivity: "Remote activation pending",
      },
    ],
  },
  {
    id: "CMP-2403",
    name: "Internal Progression",
    role: "Senior Communications Officer",
    status: "Draft",
    deliveryMode: "Hybrid",
    premiumLocked: true,
    completion: 0,
    candidateCount: 9,
    sessions: 0,
    assessmentStack: ["Call Simulation", "Situational Judgement"],
    nextMilestone: "Confirm setup",
    candidates: [
      {
        id: "C-302",
        name: "Imran Shah",
        role: "Senior Officer",
        completion: 0,
        status: "Not started",
        lastActivity: "Draft candidate",
      },
    ],
  },
];

export const hiringManagerSessions: HiringManagerSession[] = [
  {
    id: "SES-91A",
    campaign: "MetCC Spring Intake",
    type: "In-person",
    status: "Ready to issue",
    date: "22 May 2026 · 09:30",
    location: "CTRL London",
    candidateCount: 12,
    accessMode: "Session code",
    accessValue: "METCC-22MAY-AM",
  },
  {
    id: "SES-91B",
    campaign: "MetCC Spring Intake",
    type: "In-person",
    status: "Scheduled",
    date: "24 May 2026 · 13:30",
    location: "CTRL London",
    candidateCount: 12,
    accessMode: "Session code",
    accessValue: "METCC-24MAY-PM",
  },
  {
    id: "SES-REMOTE-01",
    campaign: "Specialist Uplift",
    type: "Remote",
    premiumLocked: true,
    status: "Closed",
    date: "Premium feature",
    location: "Tokenised remote access",
    candidateCount: 18,
    accessMode: "Secure access link",
    accessValue: "Locked pending permissions",
  },
];

export const assessmentLibrary: AssessmentLibraryItem[] = [
  {
    id: "typing",
    title: "Typing Test",
    summary: "Measure typing speed and accuracy for live documentation.",
    duration: "10 min",
    skills: ["Speed", "Accuracy", "Baseline readiness"],
    whyItMatters:
      "Confirms whether candidates can document information accurately at pace.",
    videoLabel: "Typing test walkthrough",
    icon: TimerReset,
  },
  {
    id: "call-simulation",
    title: "Call Simulation",
    summary: "Assess note capture during a simulated operational call.",
    duration: "20–25 min",
    skills: ["Listening", "Documentation", "Information capture"],
    whyItMatters:
      "Shows whether candidates capture essential detail under pressure.",
    videoLabel: "Call simulation preview",
    icon: Headphones,
  },
  {
    id: "situational-judgement",
    title: "Situational Judgement",
    summary: "Evaluate decisions across realistic workplace scenarios.",
    duration: "20–25 min",
    skills: ["Judgement", "Operational reasoning", "Consistency"],
    whyItMatters:
      "Shows how candidates reason through high-stakes decisions.",
    videoLabel: "Situational judgement demo",
    icon: SlidersHorizontal,
  },
  {
    id: "prioritisation",
    title: "Prioritisation Assessment",
    summary: "Rank scenarios to assess sequencing and escalation judgement.",
    duration: "~22 min",
    skills: ["Prioritisation", "Decision flow", "Operational logic"],
    whyItMatters:
      "Tests sequence, escalation, and task discipline.",
    videoLabel: "Prioritisation assessment overview",
    icon: BookOpen,
  },
  {
    id: "psychometric",
    title: "Psychometric Assessment",
    summary: "Evaluate behavioural style and work-relevant traits.",
    duration: "20–25 min",
    skills: ["Behaviour", "Cognitive style", "Fit indicators"],
    whyItMatters:
      "Adds broader behavioural evidence when permitted.",
    videoLabel: "Psychometric assessment explainer",
    icon: BrainCircuit,
    premiumLocked: true,
  },
];

export const hiringManagerSupport = [
  {
    title: "Operations support",
    description: "Help with campaign setup, candidate access, and sessions.",
  },
  {
    title: "Assessment operations",
    description: "Request assessment guidance before campaign launch.",
  },
  {
    title: "Commercial access",
    description: "Request access to remote delivery and premium modules.",
  },
];

export const hiringManagerReportQueue = [
  {
    candidate: "Aisha Rahman",
    campaign: "MetCC Spring Intake",
    state: "Ready",
    updated: "32 minutes ago",
  },
  {
    candidate: "Harvey Stone",
    campaign: "North Region Call Handler",
    state: "Waiting",
    updated: "1 hour ago",
  },
  {
    candidate: "Kira Evans",
    campaign: "MetCC Spring Intake",
    state: "Shared",
    updated: "Yesterday",
  },
];

export function getStatusTone(
  status: HiringManagerCandidate["status"] | HiringManagerCampaign["status"] | HiringManagerSession["status"] | string
) {
  switch (status) {
    case "Report ready":
    case "Completed":
    case "Live":
      return "shrink-0 whitespace-nowrap rounded-md border-emerald-400/20 bg-emerald-400/10 text-xs text-emerald-300 hover:bg-emerald-400/10";
    case "In progress":
    case "Configured":
    case "Ready to issue":
    case "Scheduled":
      return "shrink-0 whitespace-nowrap rounded-md border-blue-400/20 bg-blue-400/10 text-xs text-blue-300 hover:bg-blue-400/10";
    case "Draft":
    case "Not started":
      return "shrink-0 whitespace-nowrap rounded-md border-white/10 bg-white/5 text-xs text-slate-300 hover:bg-white/5";
    case "Closed":
      return "shrink-0 whitespace-nowrap rounded-md border-amber-400/20 bg-amber-400/10 text-xs text-amber-300 hover:bg-amber-400/10";
    default:
      return "shrink-0 whitespace-nowrap rounded-md border-white/10 bg-white/5 text-xs text-slate-300 hover:bg-white/5";
  }
}

export const premiumLockMeta = {
  icon: Lock,
  label: "Premium locked",
  helper: "Visible for planning, unlocks when permissions and commercial access are enabled.",
};

export const sessionGuideSteps = [
  {
    title: "Create session",
    body: "Set date, candidate volume, and the intended delivery environment.",
  },
  {
    title: "Review access output",
    body: "Open the session to immediately view the code or secure link that will be issued.",
  },
  {
    title: "Monitor completion",
    body: "Track live completion status and move ready candidates into the report queue.",
  },
];
