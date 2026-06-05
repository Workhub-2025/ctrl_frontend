"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const assessments = ["Typing", "Situational Judgement", "Call Simulation", "Prioritisation"];

export default function CreateClientPage() {
  const [enabledAssessments, setEnabledAssessments] = useState<string[]>([
    "Typing",
    "Situational Judgement",
  ]);

  const toggleAssessment = (assessment: string) => {
    setEnabledAssessments((current) =>
      current.includes(assessment)
        ? current.filter((item) => item !== assessment)
        : [...current, assessment]
    );
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
          Create the organisation, initial contact, contract, and starting entitlements.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organisation Details</CardTitle>
              <CardDescription>Basic client record used across contracts and billing.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="clientName">Client organisation name</Label>
                <Input id="clientName" placeholder="Met Police" />
              </div>
              <div className="space-y-2">
                <Label>Organisation type</Label>
                <Select defaultValue="police">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="police">Police</SelectItem>
                    <SelectItem value="nhs">NHS</SelectItem>
                    <SelectItem value="fire">Fire</SelectItem>
                    <SelectItem value="ambulance">Ambulance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select defaultValue="onboarding">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Primary domain</Label>
                <Input id="domain" placeholder="met.police.uk" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Internal reference</Label>
                <Input id="reference" placeholder="CTRL-MET-001" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Primary Contact</CardTitle>
              <CardDescription>Commercial or operational contact for client approval workflows.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact name</Label>
                <Input id="contactName" placeholder="John Smith" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact email</Label>
                <Input id="contactEmail" type="email" placeholder="john.smith@met.police.uk" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact phone</Label>
                <Input id="contactPhone" placeholder="020 7230 1212" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactRole">Role/title</Label>
                <Input id="contactRole" placeholder="Commercial Lead" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Initial Contract & Entitlements</CardTitle>
              <CardDescription>Set the default plan, seat limit, and assessment access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Select defaultValue="standard">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seats">Included hiring manager seats</Label>
                  <Input id="seats" type="number" defaultValue={2} min={0} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allowance">Candidate/session allowance</Label>
                  <Input id="allowance" type="number" defaultValue={500} min={0} />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Assessment access</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  {assessments.map((assessment) => (
                    <label
                      key={assessment}
                      className="flex items-center gap-3 rounded-lg border p-3 text-sm"
                    >
                      <Checkbox
                        checked={enabledAssessments.includes(assessment)}
                        onCheckedChange={() => toggleAssessment(assessment)}
                      />
                      {assessment}
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Review</CardTitle>
            <CardDescription>Client will be created as a draft until connected to live billing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-cyan-500" />
              Organisation record
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-cyan-500" />
              Primary contact
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-cyan-500" />
              Initial contract
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-cyan-500" />
              Entitlement defaults
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1">Save draft</Button>
              <Button className="flex-1">Create client</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
