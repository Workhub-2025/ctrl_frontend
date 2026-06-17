export type AdminBroadcastAudience = "all" | "role" | "client" | "user";

export type AdminBroadcastTemplateKey =
  | "site-down"
  | "maintenance"
  | "platform-upgrade"
  | "custom";

export type AdminBroadcastRole =
  | "staff"
  | "client"
  | "hiring_manager"
  | "candidate"
  | "admin";

export const ADMIN_BROADCAST_TEMPLATE_OPTIONS: Array<{
  key: AdminBroadcastTemplateKey;
  label: string;
}> = [
  { key: "site-down", label: "Site down" },
  { key: "maintenance", label: "Scheduled maintenance" },
  { key: "platform-upgrade", label: "Platform upgrade" },
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
  custom: {
    subject: "",
    body: "",
  },
};

export const ADMIN_BROADCAST_AUDIENCE_OPTIONS: Array<{
  value: AdminBroadcastAudience | "staff";
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
    value: "role",
    label: "By role",
    description: "Target a single role type.",
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
  audienceMode: AdminBroadcastAudience | "staff";
  role: AdminBroadcastRole;
  clientDocumentId: string;
  email: string;
  subject: string;
  body: string;
  templateKey: AdminBroadcastTemplateKey;
}) {
  const base = {
    subject: form.subject.trim(),
    body: form.body.trim(),
    templateKey: form.templateKey,
  };

  if (form.audienceMode === "staff") {
    return { ...base, audience: "role" as const, role: "staff" };
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
