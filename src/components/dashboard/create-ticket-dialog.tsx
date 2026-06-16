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

interface CreateTicketDialogProps {
  children?: React.ReactNode;
  triggerLabel?: string;
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
}: CreateTicketDialogProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
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
    setSubject("");
    setDescription("");
    setPriority("normal");
    setIsSubmitting(false);
    setIsSuccess(false);
    setTicketNumber("");
    setError("");
    setFieldErrors({});
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
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
        },
      });

      setTicketNumber(ticket?.ticketNumber || "CTRL-XXXX");
      setIsSuccess(true);
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

      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Ticket className="h-5 w-5 text-primary" aria-hidden="true" />
            Create Support Ticket
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400">
            Submit a detailed ticket and our team will review it shortly.
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-10 gap-4 motion-safe:animate-in motion-safe:fade-in duration-300">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle
                className="h-7 w-7 text-emerald-400"
                aria-hidden="true"
              />
            </div>
            <div className="text-center space-y-1">
              <p className="font-mono text-xl font-bold text-primary tracking-wider">
                {ticketNumber}
              </p>
              <p className="text-lg font-bold text-foreground">
                Ticket submitted successfully
              </p>
              <p className="text-sm text-slate-400">
                Your ticket has been submitted. We&apos;ll review it shortly.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {/* Category */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Category <span className="text-red-400">*</span>
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10 rounded-lg bg-background dark:bg-[#04070d]/50 dark:border-white/10 focus:ring-primary">
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
                <p className="text-xs text-red-400 font-medium">
                  {fieldErrors.category}
                </p>
              )}
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <label
                htmlFor="ticket-subject"
                className="text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Subject <span className="text-red-400">*</span>
              </label>
              <Input
                id="ticket-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of the issue"
                maxLength={200}
                className="h-10 rounded-lg bg-background dark:bg-[#04070d]/50 dark:border-white/10 focus-visible:ring-primary"
              />
              <div className="flex justify-between">
                {fieldErrors.subject ? (
                  <p className="text-xs text-red-400 font-medium">
                    {fieldErrors.subject}
                  </p>
                ) : (
                  <span />
                )}
                <p className="text-[10px] text-slate-500">
                  {subject.length}/200
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label
                htmlFor="ticket-description"
                className="text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Description <span className="text-red-400">*</span>
              </label>
              <Textarea
                id="ticket-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe the issue in detail (min. 20 characters)"
                rows={5}
                className="rounded-lg bg-background dark:bg-[#04070d]/50 dark:border-white/10 focus-visible:ring-primary resize-none"
              />
              <div className="flex justify-between">
                {fieldErrors.description ? (
                  <p className="text-xs text-red-400 font-medium">
                    {fieldErrors.description}
                  </p>
                ) : (
                  <span />
                )}
                <p
                  className={`text-[10px] ${
                    description.length > 0 && description.length < 20
                      ? "text-red-400"
                      : "text-slate-500"
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
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Priority
              </label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-10 rounded-lg bg-background dark:bg-[#04070d]/50 dark:border-white/10 focus:ring-primary">
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
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Page Context
              </label>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-white/10 bg-white/5 text-slate-400 font-mono text-xs px-3 py-1.5 rounded-lg pointer-events-none truncate max-w-full"
                >
                  {pageContext || "/"}
                </Badge>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-400 font-medium motion-safe:animate-in motion-safe:slide-in-from-top-2">
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
              className="w-full h-11 rounded-lg font-semibold gap-2 shadow-md transition-transform hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
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
