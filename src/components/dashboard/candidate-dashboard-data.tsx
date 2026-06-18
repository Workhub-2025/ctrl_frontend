import {
  candidateAssessmentItems,
  completionLabels,
} from "@/assessments/plugins/candidate-catalog";
import {
  Headphones,
  KeyRound,
  LifeBuoy,
  Lock,
  MonitorSmartphone,
  RefreshCw,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export { candidateAssessmentItems, completionLabels };

export const candidateGuidanceItems: Array<{
  title: string;
  body: string;
  icon: LucideIcon;
}> = [
  {
    title: "How does my access code work?",
    body: "Your assessments are linked using your unique access code. The code is single-use and connects you to the correct campaign, so there's nothing to configure on your end.",
    icon: KeyRound,
  },
  {
    title: "What if my session is locked?",
    body: "In-person sessions may be soft-locked until an assessor unlocks them for you. If your assessment won't start, let the assessor in the room know — they can release it instantly.",
    icon: Lock,
  },
  {
    title: "Remote vs in-person setup",
    body: "Remote assessments run entirely in your browser on a stable internet connection — no install required. In-person sessions are taken on a supervised device and may need an assessor to unlock them before you begin.",
    icon: MonitorSmartphone,
  },
  {
    title: "I lost my access code",
    body: "Access codes are single-use and tied to your campaign. If you've misplaced yours or it has already been used, raise an IT ticket below and the team can reissue one for you.",
    icon: RefreshCw,
  },
  {
    title: "Something broke mid-assessment",
    body: "If the page freezes or you're disconnected, don't refresh repeatedly. Raise an IT ticket describing what happened — your progress is saved securely and support can help you resume.",
    icon: LifeBuoy,
  },
  {
    title: "How are my responses reviewed?",
    body: "Your responses are submitted securely and reviewed internally by the hiring team after completion. You don't need to do anything further once an assessment is submitted.",
    icon: ShieldCheck,
  },
  {
    title: "Who can I talk to about the role?",
    body: "For questions about the interview process, role criteria, or your application status, open your session in My Assessments and use Message hiring team — your session details are attached automatically.",
    icon: Headphones,
  },
];
