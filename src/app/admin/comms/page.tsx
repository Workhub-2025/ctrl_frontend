"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAdminResource } from "@/lib/admin-resource-cache";
import {
  ADMIN_BROADCAST_AUDIENCE_OPTIONS,
  ADMIN_BROADCAST_CONTRACT_TIER_OPTIONS,
  ADMIN_BROADCAST_PREFILLS,
  ADMIN_BROADCAST_TEMPLATE_OPTIONS,
  resolveBroadcastRequestBody,
  type AdminBroadcastAudienceMode,
  type AdminBroadcastContractTier,
  type AdminBroadcastTemplateKey,
} from "@/lib/admin-comms-templates";
import {
  AdminAlert,
  AdminPageHeader,
  AdminPanel,
  AdminSectionHeader,
} from "@/components/admin/admin-portal-ui";
import { portalInputClass, portalLabelClass } from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";

type AdminClientOption = {
  id: string;
  name: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function previewBodyHtml(body: string) {
  const trimmed = body.trim();
  if (!trimmed) return "";

  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => {
      const lines = paragraph.split("\n").map((line) => escapeHtml(line)).join("<br>");
      return `<p style="margin:0 0 12px;line-height:1.6;">${lines}</p>`;
    })
    .join("");
}

export default function AdminCommsPage() {
  const [audienceMode, setAudienceMode] = useState<AdminBroadcastAudienceMode>("staff");
  const [contractTiers, setContractTiers] = useState<AdminBroadcastContractTier[]>([
    "essential",
    "professional",
    "founder",
  ]);
  const [clientDocumentId, setClientDocumentId] = useState("");
  const [email, setEmail] = useState("");
  const [templateKey, setTemplateKey] = useState<AdminBroadcastTemplateKey>("maintenance");
  const [subject, setSubject] = useState(ADMIN_BROADCAST_PREFILLS.maintenance.subject);
  const [body, setBody] = useState(ADMIN_BROADCAST_PREFILLS.maintenance.body);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [exceedsBatchLimit, setExceedsBatchLimit] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [personalizedPreview, setPersonalizedPreview] = useState(false);
  const [samplePreview, setSamplePreview] = useState<{
    clientName: string;
    endDate: string;
    renewalPrice: string;
    recipientEmail: string;
  } | null>(null);

  const { data: clients } = useAdminResource<AdminClientOption[]>(
    "admin:clients:list",
    "/api/admin/clients",
    []
  );

  const audienceHint = useMemo(
    () => ADMIN_BROADCAST_AUDIENCE_OPTIONS.find((option) => option.value === audienceMode)?.description ?? "",
    [audienceMode]
  );

  const previewPayload = useMemo(
    () =>
      resolveBroadcastRequestBody({
        audienceMode,
        role: "client",
        clientDocumentId,
        email,
        subject,
        body,
        templateKey,
        contractTiers,
      }),
    [audienceMode, clientDocumentId, contractTiers, email, subject, body, templateKey]
  );

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        if (previewPayload.audience === "client" && !previewPayload.clientDocumentId) {
          if (!cancelled) {
            setRecipientCount(null);
            setExceedsBatchLimit(false);
            setPreviewError("Select a client organisation to preview recipients.");
          }
          return;
        }
        if (previewPayload.audience === "user" && !previewPayload.email) {
          if (!cancelled) {
            setRecipientCount(null);
            setExceedsBatchLimit(false);
            setPreviewError("Enter an email address to preview recipients.");
          }
          return;
        }
        if (previewPayload.audience === "clients" && !previewPayload.contractTiers?.length) {
          if (!cancelled) {
            setRecipientCount(null);
            setExceedsBatchLimit(false);
            setPreviewError("Select at least one contract tier.");
          }
          return;
        }

        const response = await fetch("/api/admin/comms/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(previewPayload),
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error ?? "Recipient preview could not be resolved");
        }

        if (!cancelled) {
          setRecipientCount(result.data?.recipientCount ?? 0);
          setExceedsBatchLimit(Boolean(result.data?.exceedsBatchLimit));
          setPersonalizedPreview(Boolean(result.data?.personalized));
          setSamplePreview(result.data?.samplePreview ?? null);
          setPreviewError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setRecipientCount(null);
          setExceedsBatchLimit(false);
          setPersonalizedPreview(false);
          setSamplePreview(null);
          setPreviewError(err instanceof Error ? err.message : "Recipient preview could not be resolved");
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [previewPayload]);

  const applyTemplate = (nextKey: AdminBroadcastTemplateKey) => {
    setTemplateKey(nextKey);
    const prefill = ADMIN_BROADCAST_PREFILLS[nextKey];
    if (nextKey !== "custom") {
      setSubject(prefill.subject);
      setBody(prefill.body);
    }
  };

  const toggleContractTier = (tier: AdminBroadcastContractTier, checked: boolean) => {
    setContractTiers((current) => {
      if (checked) {
        return current.includes(tier) ? current : [...current, tier];
      }
      return current.filter((value) => value !== tier);
    });
  };

  const handleSend = async () => {
    setSending(true);
    setError(null);

    try {
      const payload = resolveBroadcastRequestBody({
        audienceMode,
        role: "client",
        clientDocumentId,
        email,
        subject,
        body,
        templateKey,
        contractTiers,
      });

      if (payload.audience === "client" && !payload.clientDocumentId) {
        throw new Error("Select a client organisation");
      }
      if (payload.audience === "user" && !payload.email) {
        throw new Error("Enter an email address");
      }
      if (payload.audience === "clients" && !payload.contractTiers?.length) {
        throw new Error("Select at least one contract tier");
      }
      if (!payload.subject.trim() && templateKey === "custom") {
        throw new Error("Subject is required");
      }
      if (!payload.body.trim() && templateKey === "custom") {
        throw new Error("Body is required");
      }
      if (exceedsBatchLimit) {
        throw new Error("Recipient count exceeds the batch limit. Narrow your audience and try again.");
      }

      const response = await fetch("/api/admin/comms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Broadcast could not be sent");
      }

      const sentCount = result.data?.sentCount ?? 0;
      const failedCount = result.data?.failedCount ?? 0;
      toast({
        title: failedCount > 0 ? "Broadcast partially sent" : "Broadcast sent",
        description:
          failedCount > 0
            ? `${sentCount} delivered, ${failedCount} failed.`
            : `Delivered to ${sentCount} recipient${sentCount === 1 ? "" : "s"}.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Broadcast could not be sent";
      setError(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Operational email"
        description="Send platform announcements to selected users. Staff roles are selected by default — candidates are excluded unless you choose them explicitly."
        action={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            Batch limit 500 recipients
          </div>
        }
      />

      {error ? <AdminAlert>{error}</AdminAlert> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <AdminPanel>
          <AdminSectionHeader title="Compose" description="Choose audience, template, and message content." />

          <div className="grid gap-5">
            <div className="grid gap-2">
              <Label className={portalLabelClass}>Audience</Label>
              <Select
                value={audienceMode}
                onValueChange={(value) => setAudienceMode(value as AdminBroadcastAudienceMode)}
              >
                <SelectTrigger className={portalInputClass}>
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_BROADCAST_AUDIENCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {audienceHint ? <p className="text-xs text-muted-foreground">{audienceHint}</p> : null}
            </div>

            {audienceMode === "clients" ? (
              <div className="grid gap-2">
                <Label className={portalLabelClass}>Contract tiers</Label>
                <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                  {ADMIN_BROADCAST_CONTRACT_TIER_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-3 text-sm text-foreground"
                    >
                      <Checkbox
                        checked={contractTiers.includes(option.value)}
                        onCheckedChange={(checked) =>
                          toggleContractTier(option.value, checked === true)
                        }
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Targets client contact users on active contracts in the selected tiers.
                </p>
              </div>
            ) : null}

            {audienceMode === "client" ? (
              <div className="grid gap-2">
                <Label className={portalLabelClass}>Client organisation</Label>
                <Select value={clientDocumentId} onValueChange={setClientDocumentId}>
                  <SelectTrigger className={portalInputClass}>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {audienceMode === "user" ? (
              <div className="grid gap-2">
                <Label htmlFor="comms-email" className={portalLabelClass}>
                  Email address
                </Label>
                <Input
                  id="comms-email"
                  type="email"
                  className={portalInputClass}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="user@example.com"
                />
              </div>
            ) : null}

            <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Users className="h-4 w-4 text-muted-foreground" />
                {previewLoading ? (
                  <span className="text-muted-foreground">Counting recipients…</span>
                ) : recipientCount !== null ? (
                  <span>
                    <span className="font-semibold">{recipientCount}</span> recipient
                    {recipientCount === 1 ? "" : "s"} will receive this email
                    {personalizedPreview ? " (each with a personalized end date and renewal price)" : ""}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Recipient count unavailable</span>
                )}
              </div>
              {previewError ? (
                <p className="mt-1 text-xs text-destructive">{previewError}</p>
              ) : exceedsBatchLimit ? (
                <p className="mt-1 text-xs text-destructive">
                  Recipient count exceeds the 500-recipient batch limit. Narrow your audience.
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label className={portalLabelClass}>Template</Label>
              <Select value={templateKey} onValueChange={(value) => applyTemplate(value as AdminBroadcastTemplateKey)}>
                <SelectTrigger className={portalInputClass}>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_BROADCAST_TEMPLATE_OPTIONS.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templateKey === "renewal-price-increase" ? (
                <p className="text-xs text-muted-foreground">
                  Keep {"{endDate}"} and {"{renewalPrice}"} placeholders in the template — each recipient
                  receives their active contract end date and current catalogue renewal price for their tier.
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="comms-subject" className={portalLabelClass}>
                Subject
              </Label>
              <Input
                id="comms-subject"
                className={portalInputClass}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Email subject"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="comms-body" className={portalLabelClass}>
                Body
              </Label>
              <Textarea
                id="comms-body"
                className={cn(portalInputClass, "min-h-[220px]")}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write the operational message..."
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => void handleSend()}
                disabled={sending || previewLoading || exceedsBatchLimit}
              >
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send broadcast
              </Button>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <AdminSectionHeader title="Preview" description="Approximate rendering of the message body." />
          {samplePreview ? (
            <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">Sample recipient merge</p>
              <p>{samplePreview.clientName} · {samplePreview.recipientEmail}</p>
              <p>
                {"{endDate}"} → {samplePreview.endDate} · {"{renewalPrice}"} → {samplePreview.renewalPrice}
              </p>
            </div>
          ) : null}
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">
              {subject.trim() || "Subject preview"}
            </p>
            <div
              className="text-sm text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: previewBodyHtml(body) || "<p>No body yet.</p>" }}
            />
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}
