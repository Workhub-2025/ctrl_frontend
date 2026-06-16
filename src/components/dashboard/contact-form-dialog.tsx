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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Send, CheckCircle, Loader2 } from "lucide-react";
import { SupportTicketService } from "@/services/support-ticket.service";
import type { CandidateSessionContext } from "@/components/dashboard/candidate/candidate-portal-ui";

interface ContactFormDialogProps {
  recipient: string;
  defaultSubject?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "ghost";
  triggerIcon?: React.ReactNode;
  children?: React.ReactNode;
  /** Controlled open state (optional). Falls back to internal state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called after a message is submitted successfully. */
  onSuccess?: () => void;
  /** Optional session context attached to the ticket. */
  sessionContext?: CandidateSessionContext;
}

export function ContactFormDialog({
  recipient,
  defaultSubject = "",
  triggerLabel = "Send Message",
  triggerVariant = "default",
  triggerIcon,
  children,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
  sessionContext,
}: ContactFormDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState("");
  const [error, setError] = useState("");

  const resetForm = () => {
    setSubject(defaultSubject);
    setMessage("");
    setPriority("normal");
    setIsSubmitting(false);
    setIsSuccess(false);
    setTicketNumber("");
    setError("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
    if (!nextOpen) {
      setTimeout(resetForm, 300);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (message.trim().length < 10) {
      setError("Message must be at least 10 characters.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const ticket = await SupportTicketService.createTicket({
        subject: subject.trim() || `Message to ${recipient}`,
        description: message.trim(),
        category: "contact",
        priority,
        metadata: {
          recipient,
          ...(sessionContext ?? {}),
        },
      });

      setTicketNumber(ticket?.ticketNumber || "");
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
          <Button variant={triggerVariant} className="gap-2">
            {triggerIcon ?? <Mail className="h-4 w-4" aria-hidden="true" />}
            {triggerLabel}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="overflow-hidden sm:max-w-[480px]">
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
              <Mail className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <DialogTitle className="font-display text-lg font-bold tracking-tight text-foreground">
                Send a Message
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Your message is sent to the hiring team as a tracked ticket — save
                the reference number to follow up in ticket history.
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
              {ticketNumber ? (
                <p className="font-mono text-xl font-bold tracking-wider text-primary">
                  {ticketNumber}
                </p>
              ) : null}
              <p className="font-display text-lg font-bold text-foreground">
                Message sent successfully
              </p>
              <p className="text-sm text-muted-foreground">
                {ticketNumber
                  ? "Save this reference to track your message in ticket history."
                  : "Your message has been delivered. We'll respond as soon as possible."}
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
            {/* Recipient */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                To
              </label>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="pointer-events-none rounded-lg border-primary/20 bg-primary/10 px-3 py-1 font-semibold text-primary"
                >
                  {recipient}
                </Badge>
                {sessionContext?.campaign ? (
                  <Badge
                    variant="outline"
                    className="pointer-events-none max-w-full truncate rounded-lg px-3 py-1 text-xs"
                  >
                    {sessionContext.campaign}
                  </Badge>
                ) : null}
              </div>
              {sessionContext?.accessCode ? (
                <p className="text-xs text-muted-foreground">
                  Session code{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {sessionContext.accessCode}
                  </span>
                  {sessionContext.sessionName
                    ? ` · ${sessionContext.sessionName}`
                    : null}
                </p>
              ) : null}
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <label
                htmlFor="contact-subject"
                className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
              >
                Subject
              </label>
              <Input
                id="contact-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your query"
                className="h-10 rounded-lg border-border bg-background focus-visible:ring-primary dark:border-white/10 dark:bg-white/[0.02]"
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label
                htmlFor="contact-message"
                className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
              >
                Message <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your query in detail (min. 10 characters)"
                rows={5}
                required
                minLength={10}
                className="resize-none rounded-lg border-border bg-background focus-visible:ring-primary dark:border-white/10 dark:bg-white/[0.02]"
              />
              <div className="flex justify-end">
                <p
                  className={`text-[11px] font-medium tabular-nums ${
                    message.length > 0 && message.trim().length < 10
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {message.length} characters
                  {message.length > 0 && message.trim().length < 10
                    ? ` (min. 10)`
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
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
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
              disabled={isSubmitting || message.trim().length < 10}
              className="h-11 w-full gap-2 rounded-lg font-semibold shadow-md transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-safe:hover:scale-[1.01]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
