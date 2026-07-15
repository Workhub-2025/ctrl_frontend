"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Check, Copy, Globe2, KeyRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PortalSidePanel } from "@/components/dashboard/portal/portal-workspace-ui";
import {
  portalAlertErrorClass,
  portalBadgeClass,
  portalInputClass,
  portalLabelClass,
  portalPanelClass,
  portalPanelNestedClass,
  portalPrimaryButtonClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import {
  HiringManagerPortalClientService,
  type HiringManagerCampaignDetail,
  type HiringManagerSessionListItem,
} from "@/services/hiring-manager-portal-client.service";
import { getHmSessionDisplayName } from "@/lib/hiring-manager/session-display";

type SessionDeliveryMode = "remote" | "in_person";

function defaultDeliveryMode(
  campaign: HiringManagerCampaignDetail
): SessionDeliveryMode {
  return campaign.deliveryMode === "In-person" ? "in_person" : "remote";
}

function defaultSessionName(campaignName: string) {
  const date = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${campaignName} · Session ${date.replace(/\//g, "-")}`;
}

export function HiringManagerSessionCreatePanel({
  campaign,
  open,
  onOpenChange,
}: {
  campaign: HiringManagerCampaignDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [candidateLimit, setCandidateLimit] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [mode, setMode] = useState<SessionDeliveryMode>(() =>
    defaultDeliveryMode(campaign)
  );
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createdSession, setCreatedSession] =
    useState<HiringManagerSessionListItem | null>(null);
  const [copied, setCopied] = useState(false);

  const campaignId = campaign.documentId ?? campaign.id;
  const isHybrid = campaign.deliveryMode === "Hybrid";
  const minDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 10);
  }, []);

  useEffect(() => {
    if (!open) return;
    setName(defaultSessionName(campaign.name));
    setCandidateLimit(String(Math.max(1, campaign.candidateCount || 12)));
    setDate("");
    setTime("");
    const deliveryMode = defaultDeliveryMode(campaign);
    setMode(deliveryMode);
    setLocation(deliveryMode === "in_person" ? campaign.location : "");
    setError(null);
    setCreatedSession(null);
    setCopied(false);
  }, [campaign, open]);

  const handlePanelOpenChange = (nextOpen: boolean) => {
    if (isCreating && !nextOpen) return;
    onOpenChange(nextOpen);
  };

  const createSession = async () => {
    setError(null);
    const parsedLimit = Number.parseInt(candidateLimit, 10);

    if (!name.trim()) {
      setError("Enter a session name.");
      return;
    }
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 500) {
      setError("Candidate capacity must be between 1 and 500.");
      return;
    }
    if (!date || !time) {
      setError("Choose the session start date and time.");
      return;
    }
    const startsAt = new Date(`${date}T${time}`);
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now()) {
      setError("Choose a start time in the future.");
      return;
    }
    if (mode === "in_person" && !location.trim()) {
      setError("Enter the room or location for an in-person session.");
      return;
    }

    setIsCreating(true);
    try {
      const created = await HiringManagerPortalClientService.createSession({
        campaignDocumentId: campaignId,
        name: name.trim(),
        candidateLimit: parsedLimit,
        startsAt: startsAt.toISOString(),
        location: mode === "remote" ? "Remote session" : location.trim(),
        mode,
      });
      if (!created) throw new Error("Session was created but could not be loaded.");
      setCreatedSession(created);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Session could not be created."
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <PortalSidePanel
      open={open}
      onOpenChange={handlePanelOpenChange}
      eyebrow="Campaign session"
      title={createdSession ? "Session created" : "Create session"}
      description={
        createdSession
          ? "The access code is ready to share with candidates."
          : `Add a delivery session to ${campaign.name}.`
      }
      icon={KeyRound}
      width="sm"
      footer={
        createdSession ? (
          <Button
            type="button"
            onClick={() => handlePanelOpenChange(false)}
            className={cn(portalPrimaryButtonClass, "h-10 w-full")}
          >
            Done
          </Button>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handlePanelOpenChange(false)}
              disabled={isCreating}
              className="h-10"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void createSession()}
              disabled={isCreating}
              className={cn(portalPrimaryButtonClass, "h-10")}
            >
              {isCreating ? "Creating…" : "Create session"}
            </Button>
          </div>
        )
      }
    >
      {createdSession ? (
        <div className="space-y-5" aria-live="polite">
          <div className={cn(portalPanelClass, "p-5 text-center")}>
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              <Check className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-3 text-base font-semibold text-foreground">
              {getHmSessionDisplayName(createdSession)}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {createdSession.date} · {createdSession.location}
            </p>
          </div>

          <div className={cn(portalPanelNestedClass, "p-5 text-center")}>
            <p className={portalLabelClass}>Candidate access code</p>
            <p className="mt-2 break-all font-mono text-2xl font-bold tracking-[0.18em] text-foreground">
              {createdSession.accessValue}
            </p>
            <Button
              type="button"
              variant="outline"
              aria-live="polite"
              onClick={() => {
                void navigator.clipboard?.writeText(createdSession.accessValue);
                setCopied(true);
              }}
              className="mt-4 h-9 w-full"
            >
              {copied ? (
                <Check className="mr-2 h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy access code"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className={cn(portalPanelNestedClass, "space-y-3 p-4")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={portalLabelClass}>Campaign</p>
                <p className="mt-1 break-words text-sm font-semibold text-foreground">
                  {campaign.name}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {campaign.role}
                </p>
              </div>
              <span className={cn(portalBadgeClass, "shrink-0 px-2.5 py-1 text-xs font-semibold")}>
                {campaign.deliveryMode}
              </span>
            </div>
            <div className="flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              Planned capacity: {campaign.candidateCount} candidate
              {campaign.candidateCount === 1 ? "" : "s"}
            </div>
          </div>

          {error ? (
            <p className={cn(portalAlertErrorClass, "text-xs leading-5")} aria-live="polite">
              {error}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="campaignSessionName" className={portalLabelClass}>
              Session name
            </Label>
            <Input
              id="campaignSessionName"
              name="campaignSessionName"
              autoComplete="off"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              className={portalInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaignSessionCapacity" className={portalLabelClass}>
              Candidate capacity
            </Label>
            <Input
              id="campaignSessionCapacity"
              name="campaignSessionCapacity"
              autoComplete="off"
              inputMode="numeric"
              value={candidateLimit}
              onChange={(event) =>
                setCandidateLimit(event.target.value.replace(/\D/g, "").slice(0, 3))
              }
              className={portalInputClass}
            />
            <div className="flex flex-wrap gap-2" aria-label="Candidate capacity presets">
              {[5, 12, 25, 50].map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  onClick={() => setCandidateLimit(String(value))}
                  className="h-8 px-3 text-xs"
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="campaignSessionDate" className={portalLabelClass}>
                Start date
              </Label>
              <Input
                id="campaignSessionDate"
                name="campaignSessionDate"
                autoComplete="off"
                type="date"
                min={minDate}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={portalInputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaignSessionTime" className={portalLabelClass}>
                Start time
              </Label>
              <Input
                id="campaignSessionTime"
                name="campaignSessionTime"
                autoComplete="off"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className={portalInputClass}
              />
            </div>
          </div>

          {isHybrid ? (
            <div className="space-y-2">
              <Label htmlFor="campaignSessionMode" className={portalLabelClass}>
                Delivery format
              </Label>
              <Select
                name="campaignSessionMode"
                value={mode}
                onValueChange={(value) => setMode(value as SessionDeliveryMode)}
              >
                <SelectTrigger id="campaignSessionMode" className={portalInputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="in_person">In-person</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className={cn(portalPanelNestedClass, "flex items-center gap-3 p-3 text-sm")}>
              {mode === "remote" ? (
                <Globe2 className="h-4 w-4 text-primary" aria-hidden="true" />
              ) : (
                <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
              )}
              <span className="font-medium text-foreground">
                {mode === "remote" ? "Remote delivery" : "In-person delivery"}
              </span>
            </div>
          )}

          {mode === "in_person" ? (
            <div className="space-y-2">
              <Label htmlFor="campaignSessionLocation" className={portalLabelClass}>
                Room or location
              </Label>
              <Input
                id="campaignSessionLocation"
                name="campaignSessionLocation"
                autoComplete="off"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                maxLength={180}
                placeholder={campaign.location || "e.g. Assessment room…"}
                className={portalInputClass}
              />
            </div>
          ) : null}
        </div>
      )}
    </PortalSidePanel>
  );
}
