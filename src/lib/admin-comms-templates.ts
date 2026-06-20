export type AdminBroadcastAudience = "all" | "role" | "client" | "clients" | "user";

export type AdminBroadcastContractTier = "essential" | "professional" | "founder";

export type AdminBroadcastTemplateKey =
  | "site-down"
  | "maintenance"
  | "platform-upgrade"
  | "renewal-price-increase"
  | "custom";

export type AdminBroadcastRole =
  | "staff"
  | "client"
  | "hiring_manager"
  | "candidate"
  | "admin";

export type AdminBroadcastAudienceMode =
  | AdminBroadcastAudience
  | "staff"
  | "candidate"
  | "hiring_manager"
  | "clients";

export const ADMIN_BROADCAST_CONTRACT_TIER_OPTIONS: Array<{
  value: AdminBroadcastContractTier;
  label: string;
}> = [
  { value: "essential", label: "Essential" },
  { value: "professional", label: "Professional" },
  { value: "founder", label: "Founder" },
];

export const ADMIN_BROADCAST_TEMPLATE_OPTIONS: Array<{
  key: AdminBroadcastTemplateKey;
  label: string;
}> = [
  { key: "site-down", label: "Site down" },
  { key: "maintenance", label: "Scheduled maintenance" },
  { key: "platform-upgrade", label: "Platform upgrade" },
  { key: "renewal-price-increase", label: "Renewal price increase" },
  { key: "custom", label: "Custom message" },
];

export const ADMIN_BROADCAST_PREFILLS: Record<
  AdminBroadcastTemplateKey,
  { subject: string; body: string }
> = {
  "site-down": {
    subject: "CTRL Assessments — temporary service interruption",
    body: [
      "We are currently experiencing a service interruption affecting access to CTRL Assessments.",
      "",
      "Our team is working to restore service as quickly as possible. We will send another update when the platform is available again.",
      "",
      "We apologise for any inconvenience.",
    ].join("\n"),
  },
  maintenance: {
    subject: "Scheduled maintenance — CTRL Assessments",
    body: [
      "CTRL Assessments will undergo scheduled maintenance shortly.",
      "",
      "During this window the platform may be unavailable or slower than usual. We will notify you when maintenance is complete.",
      "",
      "Thank you for your patience.",
    ].join("\n"),
  },
  "platform-upgrade": {
    subject: "Platform upgrade — CTRL Assessments",
    body: [
      "We are rolling out a platform upgrade to CTRL Assessments.",
      "",
      "You may notice brief interruptions or new features appearing in your portal. No action is required on your part.",
      "",
      "If you experience any issues after the upgrade, please contact support.",
    ].join("\n"),
  },
  "renewal-price-increase": {
    subject: "Contract renewal pricing update — CTRL Assessments",
    body: [
      "Your annual platform licence is due for renewal on {endDate}.",
      "",
      "From your next renewal term, your annual platform fee will be {renewalPrice}. Your monthly direct debit will be updated to reflect the new annual rate.",
      "",
      "If you have questions about your renewal or would like to discuss your contract, please reply to this email or contact support.",
    ].join("\n"),
  },
  custom: {
    subject: "",
    body: "",
  },
};

export const ADMIN_BROADCAST_AUDIENCE_OPTIONS: Array<{
  value: AdminBroadcastAudienceMode;
  label: string;
  description: string;
}> = [
  {
    value: "staff",
    label: "Staff roles (default)",
    description: "Client contacts, hiring managers, and CTRL admins — excludes candidates.",
  },
  {
    value: "all",
    label: "All users",
    description: "Every active account including candidates.",
  },
  {
    value: "candidate",
    label: "Candidates",
    description: "All active candidate accounts.",
  },
  {
    value: "hiring_manager",
    label: "Hiring managers",
    description: "All active hiring manager accounts.",
  },
  {
    value: "clients",
    label: "Client contacts by tier",
    description: "Client contact users on active contracts — filter by contract tier.",
  },
  {
    value: "client",
    label: "By client organisation",
    description: "Users linked to one client org.",
  },
  {
    value: "user",
    label: "Single email",
    description: "Send to one email address.",
  },
];

export function resolveBroadcastRequestBody(form: {
  audienceMode: AdminBroadcastAudienceMode;
  role: AdminBroadcastRole;
  clientDocumentId: string;
  email: string;
  subject: string;
  body: string;
  templateKey: AdminBroadcastTemplateKey;
  contractTiers: AdminBroadcastContractTier[];
}) {
  const base = {
    subject: form.subject.trim(),
    body: form.body.trim(),
    templateKey: form.templateKey,
  };

  if (form.audienceMode === "staff") {
    return { ...base, audience: "role" as const, role: "staff" };
  }

  if (form.audienceMode === "candidate") {
    return { ...base, audience: "role" as const, role: "candidate" };
  }

  if (form.audienceMode === "hiring_manager") {
    return { ...base, audience: "role" as const, role: "hiring_manager" };
  }

  if (form.audienceMode === "clients") {
    return {
      ...base,
      audience: "clients" as const,
      contractTiers: form.contractTiers,
    };
  }

  if (form.audienceMode === "role") {
    return { ...base, audience: "role" as const, role: form.role };
  }

  if (form.audienceMode === "client") {
    return {
      ...base,
      audience: "client" as const,
      clientDocumentId: form.clientDocumentId,
    };
  }

  if (form.audienceMode === "user") {
    return { ...base, audience: "user" as const, email: form.email.trim() };
  }

  return { ...base, audience: "all" as const };
}
