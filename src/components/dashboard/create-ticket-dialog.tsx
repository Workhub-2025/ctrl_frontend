"use client";

import * as React from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Ticket, CheckCircle, Loader2, Send } from "lucide-react";
import { SupportTicketService } from "@/services/support-ticket.service";
import type { CandidateSessionContext } from "@/components/dashboard/candidate/candidate-portal-ui";

interface CreateTicketDialogProps {
  children?: React.ReactNode;
  triggerLabel?: string;
  /** Controlled open state (optional). Falls back to internal state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  /** Pre-fill the subject field when the dialog opens. */
  defaultSubject?: string;
  /** Called after a ticket is submitted successfully. */
  onSuccess?: () => void;
  sessionContext?: CandidateSessionContext;
}

const CATEGORIES = [
  { value: "bug", label: "Bug Report" },
  { value: "feature_request", label: "Feature Request" },
  { value: "access_issue", label: "Access Issue" },
  { value: "assessment_issue", label: "Assessment Issue" },
  { value: "general", label: "General" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export function CreateTicketDialog({
  children,
  triggerLabel = "Create Ticket",
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  defaultSubject = "",
  onSuccess,
  sessionContext,
}: CreateTicketDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const pageContext =
    typeof window !== "undefined" ? window.location.pathname : "";

  const resetForm = () => {
    setCategory("");
    setSubject(defaultSubject);
    setDescription("");
    setPriority("normal");
    setIsSubmitting(false);
    setIsSuccess(false);
    setTicketNumber("");
    setError("");
    setFieldErrors({});
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
    if (!nextOpen) {
      setTimeout(resetForm, 300);
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!category) errors.category = "Please select a category.";
    if (!subject.trim()) errors.subject = "Subject is required.";
    else if (subject.trim().length > 200)
      errors.subject = "Subject must be 200 characters or fewer.";
    if (!description.trim())
      errors.description = "Description is required.";
    else if (description.trim().length < 20)
      errors.description = "Description must be at least 20 characters.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setError("");

    try {
      const ticket = await SupportTicketService.createTicket({
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
        metadata: {
          pageUrl: window.location.pathname,
          userAgent: navigator.userAgent,
          ...(sessionContext ?? {}),
        },
      });

      setTicketNumber(ticket?.ticketNumber || "CTRL-XXXX");
      setIsSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children ?? (
          <Button className="gap-2">
            <Ticket className="h-4 w-4" aria-hidden="true" />
            {triggerLabel}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="overflow-hidden sm:max-w-[520px]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
          aria-hidden="true"
        />
        <DialogHeader className="pr-10">
          <div className="flex items-start gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"
              aria-hidden="true"
            >
              <Ticket className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <DialogTitle className="font-display text-lg font-bold tracking-tight text-foreground">
                Create Support Ticket
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Submit a detailed ticket and our team will review it shortly.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center gap-4 py-10 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
              <CheckCircle
                className="h-7 w-7 text-emerald-500 dark:text-emerald-400"
                aria-hidden="true"
              />
            </div>
            <div className="space-y-1.5 text-center">
              <p className="font-mono text-xl font-bold tracking-wider text-primary">
                {ticketNumber}
              </p>
              <p className="font-display text-lg font-bold text-foreground">
                Ticket submitted successfully
              </p>
              <p className="text-sm text-muted-foreground">
                Your ticket has been submitted. We&apos;ll review it shortly.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="mt-2 h-10 rounded-lg px-8 font-semibold focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 pt-1">
            {/* Category */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Category <span className="text-destructive">*</span>
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10 rounded-lg border-border bg-background focus:ring-primary dark:border-white/10 dark:bg-white/[0.02]">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.category && (
                <p className="text-xs font-medium text-destructive">
                  {fieldErrors.category}
                </p>
              )}
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <label
                htmlFor="ticket-subject"
                className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
              >
                Subject <span className="text-destructive">*</span>
              </label>
              <Input
                id="ticket-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of the issue"
                maxLength={200}
                className="h-10 rounded-lg border-border bg-background focus-visible:ring-primary dark:border-white/10 dark:bg-white/[0.02]"
              />
              <div className="flex items-center justify-between gap-3">
                {fieldErrors.subject ? (
                  <p className="text-xs font-medium text-destructive">
                    {fieldErrors.subject}
                  </p>
                ) : (
                  <span />
                )}
                <p className="text-[11px] font-medium tabular-nums text-muted-foreground">
                  {subject.length}/200
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label
                htmlFor="ticket-description"
                className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
              >
                Description <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="ticket-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe the issue in detail (min. 20 characters)"
                rows={5}
                className="resize-none rounded-lg border-border bg-background focus-visible:ring-primary dark:border-white/10 dark:bg-white/[0.02]"
              />
              <div className="flex items-center justify-between gap-3">
                {fieldErrors.description ? (
                  <p className="text-xs font-medium text-destructive">
                    {fieldErrors.description}
                  </p>
                ) : (
                  <span />
                )}
                <p
                  className={`text-[11px] font-medium tabular-nums ${
                    description.length > 0 && description.length < 20
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {description.length} characters
                  {description.length > 0 && description.length < 20
                    ? ` (${20 - description.length} more needed)`
                    : ""}
                </p>
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Priority
              </label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-10 rounded-lg border-border bg-background focus:ring-primary dark:border-white/10 dark:bg-white/[0.02]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Page Context */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Context
              </label>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="pointer-events-none max-w-full truncate rounded-lg border-border bg-muted/50 px-3 py-1.5 font-mono text-xs text-muted-foreground dark:border-white/10 dark:bg-white/5"
                >
                  {pageContext || "/"}
                </Badge>
                {sessionContext?.campaign ? (
                  <Badge
                    variant="outline"
                    className="pointer-events-none max-w-full truncate rounded-lg px-3 py-1.5 text-xs"
                  >
                    {sessionContext.campaign}
                  </Badge>
                ) : null}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive motion-safe:animate-in motion-safe:slide-in-from-top-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !category ||
                !subject.trim() ||
                description.trim().length < 20
              }
              className="h-11 w-full gap-2 rounded-lg font-semibold shadow-md transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-safe:hover:scale-[1.01]"
            >
              {isSubmitting ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Submit Ticket
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
