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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Client could not be created");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="gap-2 px-0">
        <Link href="/admin/clients">
          <ArrowLeft className="h-4 w-4" />
          Back to clients
        </Link>
      </Button>

      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-500/80">
          Client Creation
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create Client</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Create the organisation record, primary contact, active contract, and optional registration code.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {created && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-4 text-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
            <div className="space-y-2">
              <p className="font-medium">{created.client?.name ?? "Client"} created successfully.</p>
              {created.accessCode?.code && (
                <div className="rounded-md border bg-background p-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Client registration code</p>
                  <p className="mt-2 break-all font-mono text-base font-semibold">
                    {created.accessCode.code}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Expires {new Date(created.accessCode.expiresAt).toLocaleString("en-GB")}. This code is shown once.
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="button" onClick={() => router.push("/admin/clients")}>
                  View clients
                </Button>
                <Button type="button" variant="outline" onClick={() => setCreated(null)}>
                  Create another
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organisation</CardTitle>
              <CardDescription>Only fields stored on the Client record are included here.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="clientName">Client organisation name</Label>
                <Input
                  id="clientName"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Met Police"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="legalName">Legal name</Label>
                <Input
                  id="legalName"
                  value={form.legalName}
                  onChange={(event) => updateField("legalName", event.target.value)}
                  placeholder="Metropolitan Police Service"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="officeAddress">Office address</Label>
                <Input
                  id="officeAddress"
                  value={form.officeAddress}
                  onChange={(event) => updateField("officeAddress", event.target.value)}
                  placeholder="Head office address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  placeholder="London"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">County / region</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={(event) => updateField("state", event.target.value)}
                  placeholder="Greater London"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">Postcode</Label>
                <Input
                  id="zipCode"
                  value={form.zipCode}
                  onChange={(event) => updateField("zipCode", event.target.value)}
                  placeholder="SW1A 1AA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeZone">Time zone</Label>
                <Input
                  id="timeZone"
                  value={form.timeZone}
                  onChange={(event) => updateField("timeZone", event.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Primary Contact</CardTitle>
              <CardDescription>The person who receives client registration and approval workflow updates.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact name</Label>
                <Input
                  id="contactName"
                  value={form.primaryContactName}
                  onChange={(event) => updateField("primaryContactName", event.target.value)}
                  placeholder="John Smith"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={form.primaryContactEmail}
                  onChange={(event) => updateField("primaryContactEmail", event.target.value)}
                  placeholder="john.smith@example.gov.uk"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact phone</Label>
                <Input
                  id="contactPhone"
                  value={form.primaryContactPhone}
                  onChange={(event) => updateField("primaryContactPhone", event.target.value)}
                  placeholder="020 7230 1212"
                />
              </div>
              <div className="space-y-2">
                <Label>Campaign approval mode</Label>
                <Select
                  value={form.campaignApprovalMode}
                  onValueChange={(value) =>
                    updateField("campaignApprovalMode", value as "auto_approve" | "require_approval")
                  }
                >
                  <SelectTrigger>
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

          <Card>
            <CardHeader>
              <CardTitle>Initial Contract</CardTitle>
              <CardDescription>Seat count controls how many hiring managers the client can activate.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(event) => updateField("startDate", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={(event) => updateField("endDate", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seats">Hiring manager seats</Label>
                  <Input
                    id="seats"
                    type="number"
                    min={1}
                    value={form.seatCount}
                    onChange={(event) => updateField("seatCount", event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Contract notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  placeholder="Commercial notes, procurement reference, or onboarding context"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Review</CardTitle>
            <CardDescription>Create the client and active contract in Strapi.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-cyan-500" />
              Client organisation record
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-cyan-500" />
              Primary contact details
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-cyan-500" />
              {Number.isInteger(seatCount) && seatCount > 0 ? seatCount : 0} hiring manager seats
            </div>
            <label className="flex items-start gap-3 rounded-md border p-3">
              <Checkbox
                checked={form.issueAccessCode}
                onCheckedChange={(checked) => updateField("issueAccessCode", checked === true)}
              />
              <span>
                <span className="block font-medium">Generate client registration code</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  The code is returned once after creation so the primary contact can register.
                </span>
              </span>
            </label>
            <Button
              type="button"
              className="w-full"
              onClick={submit}
              disabled={isSubmitting || Boolean(created)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
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
