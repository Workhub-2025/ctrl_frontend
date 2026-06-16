import { Lock } from "lucide-react";
import { portalBadgeClass } from "@/components/dashboard/portal/portal-design-tokens";

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

export function getStatusTone(_status: string) {
  return `shrink-0 whitespace-nowrap ${portalBadgeClass}`;
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
