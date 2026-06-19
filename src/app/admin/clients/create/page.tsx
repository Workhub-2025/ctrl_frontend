"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail } from "lucide-react";
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
import { invalidateAdminResource } from "@/lib/admin-resource-cache";
import { AdminAlert, AdminPageHeader, AdminPanel, AdminSectionHeader } from "@/components/admin/admin-portal-ui";
import { portalIconWrapLgClass, portalInputClass, portalLabelClass } from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";

type CreatedClientResponse = {
  client?: {
    id: string;
    name: string;
    seatsAllowed: number;
  };
  accessCode?: {
    documentId?: string;
    code: string;
    expiresAt: string;
  };
};

type ContractTier = "minimum" | "professional" | "grandfather";

const CONTRACT_TIERS: Record<
  ContractTier,
  { label: string; minimumSeats: number; description: string }
> = {
  minimum: {
    label: "Minimum",
    minimumSeats: 1,
    description: "1 HM slot, core assessments, in-person delivery",
  },
  professional: {
    label: "Professional",
    minimumSeats: 3,
    description: "3 HM slots, core assessments, in-person delivery",
  },
  grandfather: {
    label: "Grandfather",
    minimumSeats: 3,
    description: "3 HM slots, remote and hybrid delivery, first-year paid features",
  },
};

export default function CreateClientPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    legalName: "",
    primaryContactName: "",
    primaryContactEmail: "",
    primaryContactPhone: "",
    officeAddress: "",
    city: "",
    state: "",
    zipCode: "",
    timeZone: "Europe/London",
    campaignApprovalMode: "require_approval" as "auto_approve" | "require_approval",
    contractTier: "professional" as ContractTier,
    seatCount: "3",
    notes: "",
    issueAccessCode: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedClientResponse | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [activationSent, setActivationSent] = useState(false);
  const [sendingActivation, setSendingActivation] = useState(false);

  const seatCount = CONTRACT_TIERS[form.contractTier].minimumSeats;

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateContractTier = (tier: ContractTier) => {
    setForm((current) => ({
      ...current,
      contractTier: tier,
    }));
  };

  const submit = async () => {
    setError(null);
    setCreated(null);

    if (!form.name.trim()) {
      setError("Client organisation name is required.");
      return;
    }
    if (!Number.isInteger(seatCount) || seatCount < 1) {
      setError("Hiring manager seats must be at least 1.");
      return;
    }
    const tierMinimumSeats = CONTRACT_TIERS[form.contractTier].minimumSeats;
    if (seatCount < tierMinimumSeats) {
      setError(`${CONTRACT_TIERS[form.contractTier].label} contracts require at least ${tierMinimumSeats} hiring manager seats.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/clients/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          legalName: form.legalName,
          primaryContactName: form.primaryContactName,
          primaryContactEmail: form.primaryContactEmail,
          primaryContactPhone: form.primaryContactPhone,
          officeAddress: form.officeAddress,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode,
          timeZone: form.timeZone,
          campaignApprovalMode: form.campaignApprovalMode,
          contract: {
            tier: form.contractTier,
            seatCount,
            notes: form.notes,
          },
          issueAccessCode: form.issueAccessCode,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "Client could not be created");
      }

      setCreated(body.data ?? null);
      setInviteEmail(form.primaryContactEmail.trim().toLowerCase());
      setInviteSent(false);
      setActivationSent(false);
      invalidateAdminResource("admin:clients");
      invalidateAdminResource("admin:overview");
      invalidateAdminResource("admin:upgrades");

      const clientId = body.data?.client?.id;
      if (clientId) {
        setSendingActivation(true);
        try {
          const activationResponse = await fetch(
            `/api/admin/billing/send-activation/${encodeURIComponent(clientId)}`,
            { method: "POST" }
          );
          if (activationResponse.ok) {
            setActivationSent(true);
          }
        } catch {
          // Non-blocking — admin can resend from client detail
        } finally {
          setSendingActivation(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Client could not be created");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendClientInvite = async () => {
    if (!created?.client?.id || !inviteEmail.trim()) return;
    setSendingInvite(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/clients/${encodeURIComponent(created.client.id)}/send-invite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: inviteEmail.trim().toLowerCase(),
            accessCodeDocumentId: created.accessCode?.documentId,
          }),
        }
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "Client invite could not be sent");
      }
      setInviteSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Client invite could not be sent");
    } finally {
      setSendingInvite(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Add client"
        description="Create the organisation, primary contact, pending contract, and optional registration code."
        notice={
          error ? (
            <AdminAlert>{error}</AdminAlert>
          ) : created ? (
            <AdminAlert tone="info">
              <div className="flex items-start gap-3">
                <span className={portalIconWrapLgClass}>
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="space-y-3 flex-1">
                  <p className="font-semibold">{created.client?.name ?? "Client"} created successfully.</p>
                  {sendingActivation ? (
                    <p className="text-sm text-muted-foreground">Sending activation invoice…</p>
                  ) : activationSent ? (
                    <p className="text-sm text-muted-foreground">
                      Activation invoice sent to the client contact email on file.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Send an activation invoice from the client detail page if payment is required.
                    </p>
                  )}
                  {created.accessCode?.code && (
                    <div className="rounded-lg border border-border/60 bg-background/50 p-3.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Client registration code
                      </p>
                      <p className="mt-2 break-all rounded-md border border-border/60 bg-muted/40 px-3 py-2 font-mono text-base font-bold">
                        {created.accessCode.code}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Expires {new Date(created.accessCode.expiresAt).toLocaleString("en-GB")}. This code is shown once.
                      </p>
                    </div>
                  )}
                  <div className="rounded-lg border border-border/60 bg-background/50 p-3.5 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Email the client contact an invitation with their registration access code.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="inviteEmail" className={portalLabelClass}>Client contact email</Label>
                      <Input
                        id="inviteEmail"
                        type="email"
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="contact@organisation.gov.uk"
                        className={cn(portalInputClass, "h-10")}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-lg text-xs font-semibold"
                      onClick={sendClientInvite}
                      disabled={sendingInvite || inviteSent || !inviteEmail.trim()}
                    >
                      {sendingInvite ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending…
                        </>
                      ) : inviteSent ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Invite sent
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Send client invite
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {created.client?.id ? (
                      <Button type="button" asChild className="h-9 rounded-lg text-xs font-semibold">
                        <Link href={`/admin/clients/${encodeURIComponent(created.client.id)}`}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Open client
                        </Link>
                      </Button>
                    ) : (
                      <Button type="button" onClick={() => router.push("/admin/clients")} className="h-9 rounded-lg text-xs font-semibold">
                        View clients
                      </Button>
                    )}
                    <Button type="button" variant="outline" onClick={() => setCreated(null)} className="h-9 rounded-lg text-xs font-semibold">
                      Create another
                    </Button>
                  </div>
                </div>
              </div>
            </AdminAlert>
          ) : null
        }
        action={
          <Button asChild variant="outline" className="rounded-lg">
            <Link href="/admin/clients">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to clients
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <AdminPanel className="space-y-4">
            <AdminSectionHeader
              title="Organisation"
              description="Only fields stored on the Client record are included here."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="clientName" className={portalLabelClass}>Client organisation name</Label>
                <Input
                  id="clientName"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Met Police"
                  className={cn(portalInputClass, "h-10")}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="legalName" className={portalLabelClass}>Legal name</Label>
                <Input
                  id="legalName"
                  value={form.legalName}
                  onChange={(event) => updateField("legalName", event.target.value)}
                  placeholder="Metropolitan Police Service"
                  className={cn(portalInputClass, "h-10")}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="officeAddress" className={portalLabelClass}>Office address</Label>
                <Input
                  id="officeAddress"
                  value={form.officeAddress}
                  onChange={(event) => updateField("officeAddress", event.target.value)}
                  placeholder="Head office address"
                  className={cn(portalInputClass, "h-10")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className={portalLabelClass}>City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  placeholder="London"
                  className={cn(portalInputClass, "h-10")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state" className={portalLabelClass}>County / region</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={(event) => updateField("state", event.target.value)}
                  placeholder="Greater London"
                  className={cn(portalInputClass, "h-10")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode" className={portalLabelClass}>Postcode</Label>
                <Input
                  id="zipCode"
                  value={form.zipCode}
                  onChange={(event) => updateField("zipCode", event.target.value)}
                  placeholder="SW1A 1AA"
                  className={cn(portalInputClass, "h-10")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeZone" className={portalLabelClass}>Time zone</Label>
                <Input
                  id="timeZone"
                  value={form.timeZone}
                  onChange={(event) => updateField("timeZone", event.target.value)}
                  className={cn(portalInputClass, "h-10")}
                />
              </div>
            </div>
          </AdminPanel>

          <AdminPanel className="space-y-4">
            <AdminSectionHeader
              title="Primary Contact"
              description="The person who receives client registration and approval workflow updates."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactName" className={portalLabelClass}>Contact name</Label>
                <Input
                  id="contactName"
                  value={form.primaryContactName}
                  onChange={(event) => updateField("primaryContactName", event.target.value)}
                  placeholder="John Smith"
                  className={cn(portalInputClass, "h-10")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail" className={portalLabelClass}>Contact email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={form.primaryContactEmail}
                  onChange={(event) => updateField("primaryContactEmail", event.target.value)}
                  placeholder="john.smith@example.gov.uk"
                  className={cn(portalInputClass, "h-10")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone" className={portalLabelClass}>Contact phone</Label>
                <Input
                  id="contactPhone"
                  value={form.primaryContactPhone}
                  onChange={(event) => updateField("primaryContactPhone", event.target.value)}
                  placeholder="020 7230 1212"
                  className={cn(portalInputClass, "h-10")}
                />
              </div>
              <div className="space-y-2">
                <Label className={portalLabelClass}>Campaign approval mode</Label>
                <Select
                  value={form.campaignApprovalMode}
                  onValueChange={(value) =>
                    updateField("campaignApprovalMode", value as "auto_approve" | "require_approval")
                  }
                >
                  <SelectTrigger className={cn(portalInputClass, "h-10")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="require_approval">Client approves campaigns</SelectItem>
                    <SelectItem value="auto_approve">Auto-approve campaigns</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel className="space-y-5">
            <AdminSectionHeader
              title="Initial Contract"
              description="Seat count is set now. Contract dates begin only after the client pays the activation invoice."
            />
            <div className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className={portalLabelClass}>Contract type</Label>
                  <Select
                    value={form.contractTier}
                    onValueChange={(value) => updateContractTier(value as ContractTier)}
                  >
                    <SelectTrigger className={cn(portalInputClass, "h-10")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONTRACT_TIERS).map(([tier, meta]) => (
                        <SelectItem key={tier} value={tier}>
                          {meta.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {CONTRACT_TIERS[form.contractTier].description} (minimum {CONTRACT_TIERS[form.contractTier].minimumSeats} seat{CONTRACT_TIERS[form.contractTier].minimumSeats === 1 ? "" : "s"} included)
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className={portalLabelClass}>Contract notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  placeholder="Commercial notes, procurement reference, or onboarding context"
                  className={cn(portalInputClass, "min-h-24")}
                />
              </div>
            </div>
          </AdminPanel>
        </div>

        <AdminPanel className="h-fit space-y-4">
          <AdminSectionHeader
            title="Review"
            description="Create the client and pending contract in Strapi."
          />
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3 font-medium text-foreground">
              <span className={portalIconWrapLgClass}>
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              </span>
              Client organisation record
            </div>
            <div className="flex items-center gap-3 font-medium text-foreground">
              <span className={portalIconWrapLgClass}>
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              </span>
              Primary contact details
            </div>
            <div className="flex items-center gap-3 font-medium text-foreground">
              <span className={portalIconWrapLgClass}>
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              </span>
              {CONTRACT_TIERS[form.contractTier].label} contract with{" "}
              {Number.isInteger(seatCount) && seatCount > 0 ? seatCount : 0} hiring manager seats
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3.5 transition-colors hover:bg-muted/30 dark:border-white/8">
              <Checkbox
                checked={form.issueAccessCode}
                onCheckedChange={(checked) => updateField("issueAccessCode", checked === true)}
                className="mt-0.5 rounded-md"
              />
              <span>
                <span className="block text-xs font-semibold text-foreground">Generate registration code</span>
                <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
                  The code is returned once after creation so the primary contact can register.
                </span>
              </span>
            </label>
            <Button
              type="button"
              className="h-10 w-full rounded-xl font-semibold"
              onClick={submit}
              disabled={isSubmitting || Boolean(created)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Create client
                </>
              )}
            </Button>
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}
