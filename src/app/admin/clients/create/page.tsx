"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";

type CreatedClientResponse = {
  client?: {
    id: string;
    name: string;
    seatsAllowed: number;
  };
  accessCode?: {
    code: string;
    expiresAt: string;
  };
};

const today = new Date().toISOString().slice(0, 10);
const oneYearFromToday = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

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
    startDate: today,
    endDate: oneYearFromToday,
    seatCount: "2",
    notes: "",
    issueAccessCode: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedClientResponse | null>(null);

  const seatCount = useMemo(() => Number.parseInt(form.seatCount, 10), [form.seatCount]);

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
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
    if (new Date(form.endDate).getTime() <= new Date(form.startDate).getTime()) {
      setError("Contract end date must be after the start date.");
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
            startDate: form.startDate,
            endDate: form.endDate,
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
      invalidateAdminResource("admin:clients");
      invalidateAdminResource("admin:overview");
      invalidateAdminResource("admin:upgrades");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Client could not be created");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <HiringManagerPageHeader
        eyebrow="Client Creation"
        title="Create Client"
        description="Create the organisation record, primary contact, active contract, and optional registration code."
        icon={KeyRound}
        notice={
          error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          ) : created ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400 shrink-0" />
                <div className="space-y-3 flex-1">
                  <p className="font-semibold text-white">{created.client?.name ?? "Client"} created successfully.</p>
                  {created.accessCode?.code && (
                    <div className="rounded-lg border border-white/5 bg-[#080c16]/55 p-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Client registration code</p>
                      <p className="mt-2 break-all font-mono text-base font-black text-white bg-black/45 py-2 px-3 rounded-md border border-white/5">
                        {created.accessCode.code}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Expires {new Date(created.accessCode.expiresAt).toLocaleString("en-GB")}. This code is shown once.
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="button" onClick={() => router.push("/admin/clients")} className="h-[34px] rounded-lg text-xs font-semibold">
                      View clients
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setCreated(null)} className="h-[34px] rounded-lg text-xs font-semibold border-white/10 hover:bg-white/10">
                      Create another
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null
        }
        action={
          <Button asChild variant="outline" className="border-white/10 hover:bg-white/10 text-slate-200">
            <Link href="/admin/clients">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to clients
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 dark:border-white/5 dark:bg-[#0b1329]/25 shadow-sm backdrop-blur-md">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-indigo-500" />
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">Organisation</CardTitle>
              <CardDescription className="text-slate-400">Only fields stored on the Client record are included here.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="clientName" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Client organisation name</Label>
                <Input
                  id="clientName"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Met Police"
                  className="h-10 border-white/10 bg-white/[0.02] text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="legalName" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Legal name</Label>
                <Input
                  id="legalName"
                  value={form.legalName}
                  onChange={(event) => updateField("legalName", event.target.value)}
                  placeholder="Metropolitan Police Service"
                  className="h-10 border-white/10 bg-white/[0.02] text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="officeAddress" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Office address</Label>
                <Input
                  id="officeAddress"
                  value={form.officeAddress}
                  onChange={(event) => updateField("officeAddress", event.target.value)}
                  placeholder="Head office address"
                  className="h-10 border-white/10 bg-white/[0.02] text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="text-xs font-semibold uppercase tracking-wider text-slate-400">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  placeholder="London"
                  className="h-10 border-white/10 bg-white/[0.02] text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state" className="text-xs font-semibold uppercase tracking-wider text-slate-400">County / region</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={(event) => updateField("state", event.target.value)}
                  placeholder="Greater London"
                  className="h-10 border-white/10 bg-white/[0.02] text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Postcode</Label>
                <Input
                  id="zipCode"
                  value={form.zipCode}
                  onChange={(event) => updateField("zipCode", event.target.value)}
                  placeholder="SW1A 1AA"
                  className="h-10 border-white/10 bg-white/[0.02] text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeZone" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Time zone</Label>
                <Input
                  id="timeZone"
                  value={form.timeZone}
                  onChange={(event) => updateField("timeZone", event.target.value)}
                  className="h-10 border-white/10 bg-white/[0.02] text-slate-100 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 dark:border-white/5 dark:bg-[#0b1329]/25 shadow-sm backdrop-blur-md">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-indigo-500" />
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">Primary Contact</CardTitle>
              <CardDescription className="text-slate-400">The person who receives client registration and approval workflow updates.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactName" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contact name</Label>
                <Input
                  id="contactName"
                  value={form.primaryContactName}
                  onChange={(event) => updateField("primaryContactName", event.target.value)}
                  placeholder="John Smith"
                  className="h-10 border-white/10 bg-white/[0.02] text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contact email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={form.primaryContactEmail}
                  onChange={(event) => updateField("primaryContactEmail", event.target.value)}
                  placeholder="john.smith@example.gov.uk"
                  className="h-10 border-white/10 bg-white/[0.02] text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contact phone</Label>
                <Input
                  id="contactPhone"
                  value={form.primaryContactPhone}
                  onChange={(event) => updateField("primaryContactPhone", event.target.value)}
                  placeholder="020 7230 1212"
                  className="h-10 border-white/10 bg-white/[0.02] text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Campaign approval mode</Label>
                <Select
                  value={form.campaignApprovalMode}
                  onValueChange={(value) =>
                    updateField("campaignApprovalMode", value as "auto_approve" | "require_approval")
                  }
                >
                  <SelectTrigger className="h-10 border-white/10 bg-white/[0.02] text-slate-100 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="require_approval">Client approves campaigns</SelectItem>
                    <SelectItem value="auto_approve">Auto-approve campaigns</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 dark:border-white/5 dark:bg-[#0b1329]/25 shadow-sm backdrop-blur-md">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-indigo-500" />
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">Initial Contract</CardTitle>
              <CardDescription className="text-slate-400">Seat count controls how many hiring managers the client can activate.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Start date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(event) => updateField("startDate", event.target.value)}
                    className="h-10 border-white/10 bg-white/[0.02] text-slate-100 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-xs font-semibold uppercase tracking-wider text-slate-400">End date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={(event) => updateField("endDate", event.target.value)}
                    className="h-10 border-white/10 bg-white/[0.02] text-slate-100 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seats" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hiring manager seats</Label>
                  <Input
                    id="seats"
                    type="number"
                    min={1}
                    value={form.seatCount}
                    onChange={(event) => updateField("seatCount", event.target.value)}
                    className="h-10 border-white/10 bg-white/[0.02] text-slate-100 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contract notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  placeholder="Commercial notes, procurement reference, or onboarding context"
                  className="min-h-24 border-white/10 bg-white/[0.02] text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit relative overflow-hidden rounded-2xl border border-border/50 bg-[#0e172e]/85 dark:border-white/5 dark:bg-[#0b1329]/35 shadow-xl backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base font-bold text-white">Review</CardTitle>
            <CardDescription className="text-slate-400">Create the client and active contract in Strapi.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
              Client organisation record
            </div>
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
              Primary contact details
            </div>
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
              {Number.isInteger(seatCount) && seatCount > 0 ? seatCount : 0} hiring manager seats
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.01] p-3.5 cursor-pointer hover:border-white/10 transition-colors">
              <Checkbox
                checked={form.issueAccessCode}
                onCheckedChange={(checked) => updateField("issueAccessCode", checked === true)}
                className="mt-0.5 border-white/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary rounded-md"
              />
              <span>
                <span className="block font-bold text-white text-xs">Generate registration code</span>
                <span className="mt-1 block text-[11px] leading-relaxed text-slate-400">
                  The code is returned once after creation so the primary contact can register.
                </span>
              </span>
            </label>
            <Button
              type="button"
              className="w-full h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:opacity-95 text-slate-950 font-bold transition-all shadow-[0_4px_15px_rgba(6,182,212,0.15)]"
              onClick={submit}
              disabled={isSubmitting || Boolean(created)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-950" />
                  Creating…
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4 text-slate-950" />
                  Create client
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
