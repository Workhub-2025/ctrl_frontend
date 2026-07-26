"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Check, Copy, Globe2, KeyRound, Plus, Users } from "lucide-react";
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
  OptionalDateField,
  OptionalTimeField,
} from "@/components/dashboard/portal/optional-datetime-fields";
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

const DEFAULT_START_TIME = "09:00";
const CAPACITY_PRESETS = [5, 12, 25, 50];

function defaultDeliveryMode(
  campaign: HiringManagerCampaignDetail
): SessionDeliveryMode {
  return campaign.deliveryMode === "In-person" ? "in_person" : "remote";
}

function toDateInputValue(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function addDays(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function nextMonday() {
  const date = addDays(1);
  while (date.getDay() !== 1) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function formatDateLabel(value: string) {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function autoSessionName(campaignName: string, dateValue: string) {
  const source = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  const stamp = source
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, "-");
  return `${campaignName} · Session ${stamp}`;
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
  const [time, setTime] = useState(DEFAULT_START_TIME);
  const [mode, setMode] = useState<SessionDeliveryMode>(() =>
    defaultDeliveryMode(campaign)
  );
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createdSession, setCreatedSession] =
    useState<HiringManagerSessionListItem | null>(null);
  const [copiedField, setCopiedField] = useState<"code" | "link" | null>(null);

  const campaignId = campaign.documentId ?? campaign.id;
  const isHybrid = campaign.deliveryMode === "Hybrid";
  const minDate = useMemo(() => toDateInputValue(new Date()), []);
  const scheduleShortcuts = useMemo(
    () => [
      { id: "today", label: "Today", value: toDateInputValue(addDays(0)) },
      { id: "tomorrow", label: "Tomorrow", value: toDateInputValue(addDays(1)) },
      { id: "next-monday", label: "Next Monday", value: toDateInputValue(nextMonday()) },
    ],
    []
  );

  const resetForm = useCallback(() => {
    const deliveryMode = defaultDeliveryMode(campaign);
    setName("");
    setCandidateLimit(String(Math.max(1, campaign.candidateCount || 12)));
    setDate(toDateInputValue(addDays(1)));
    setTime(DEFAULT_START_TIME);
    setMode(deliveryMode);
    setLocation(deliveryMode === "in_person" ? campaign.location : "");
    setError(null);
    setCreatedSession(null);
    setCopiedField(null);
  }, [campaign]);

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, resetForm]);

  const handlePanelOpenChange = (nextOpen: boolean) => {
    if (isCreating && !nextOpen) return;
    onOpenChange(nextOpen);
  };

  const handleModeChange = (nextMode: SessionDeliveryMode) => {
    setMode(nextMode);
    setError(null);
    if (nextMode === "in_person" && !location.trim()) {
      setLocation(campaign.location ?? "");
    }
  };

  const copyValue = (value: string, field: "code" | "link") => {
    void navigator.clipboard?.writeText(value);
    setCopiedField(field);
  };

  const createSession = async () => {
    setError(null);
    const parsedLimit = Number.parseInt(candidateLimit, 10);

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
        name: name.trim() || autoSessionName(campaign.name, date),
        candidateLimit: parsedLimit,
        startsAt: startsAt.toISOString(),
        location: mode === "remote" ? "Remote session" : location.trim(),
        mode,
      });
      if (!created) throw new Error("Session was created but could not be loaded.");
      setCreatedSession(created);
      setCopiedField(null);
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
          ? "Share the access code or join link — candidates use /join even without an invite email."
          : `Schedule a delivery session for ${campaign.name}.`
      }
      icon={KeyRound}
      width="sm"
      footer={
        createdSession ? (
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              className="h-10"
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add another
            </Button>
            <Button
              type="button"
              onClick={() => handlePanelOpenChange(false)}
              className={cn(portalPrimaryButtonClass, "h-10")}
            >
              Done
            </Button>
          </div>
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
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Candidates enter this on{" "}
              <span className="font-medium text-foreground">/join</span> to
              create their account — including remote candidates who never got
              an invite email. You can reveal it again from the session anytime.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => copyValue(createdSession.accessValue, "code")}
              className="mt-4 h-10 w-full"
            >
              {copiedField === "code" ? (
                <Check className="mr-2 h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {copiedField === "code" ? "Access code copied" : "Copy access code"}
            </Button>
            {createdSession.joinUrl ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => copyValue(createdSession.joinUrl!, "link")}
                className="mt-2 h-10 w-full"
              >
                {copiedField === "link" ? (
                  <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {copiedField === "link" ? "Join link copied" : "Copy join link"}
              </Button>
            ) : null}
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
              <span className={cn(portalBadgeClass, "shrink-0 px-2.5 py-1")}>
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
            <p className={cn(portalAlertErrorClass, "text-sm leading-5")} aria-live="polite">
              {error}
            </p>
          ) : null}

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <OptionalDateField
                id="campaignSessionDate"
                label="Start date"
                value={date}
                min={minDate}
                onChange={(value) => {
                  setDate(value);
                  setError(null);
                }}
              />
              <OptionalTimeField
                id="campaignSessionTime"
                label="Start time"
                value={time}
                onChange={(value) => {
                  setTime(value);
                  setError(null);
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Start date shortcuts">
              {scheduleShortcuts.map((shortcut) => (
                <Button
                  key={shortcut.id}
                  type="button"
                  variant={date === shortcut.value ? "default" : "outline"}
                  onClick={() => {
                    setDate(shortcut.value);
                    setError(null);
                  }}
                  className="h-8 px-3 text-xs"
                >
                  {shortcut.label}
                </Button>
              ))}
            </div>
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
              className={cn(portalInputClass, "h-10")}
            />
            <div className="flex flex-wrap gap-2" aria-label="Candidate capacity presets">
              {CAPACITY_PRESETS.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={candidateLimit === String(value) ? "default" : "outline"}
                  onClick={() => setCandidateLimit(String(value))}
                  className="h-8 px-3 text-xs"
                >
                  {value}
                </Button>
              ))}
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
                onValueChange={(value) => handleModeChange(value as SessionDeliveryMode)}
              >
                <SelectTrigger id="campaignSessionMode" className={cn(portalInputClass, "h-10")}>
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
                placeholder={campaign.location || "e.g. Assessment room"}
                className={cn(portalInputClass, "h-10")}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="campaignSessionName" className={portalLabelClass}>
              Session name (optional)
            </Label>
            <Input
              id="campaignSessionName"
              name="campaignSessionName"
              autoComplete="off"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              placeholder={autoSessionName(campaign.name, date)}
              className={cn(portalInputClass, "h-10")}
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Left blank, the session is named after the campaign and
              {date ? ` ${formatDateLabel(date)}` : " its start date"}.
            </p>
          </div>
        </div>
      )}
    </PortalSidePanel>
  );
}
