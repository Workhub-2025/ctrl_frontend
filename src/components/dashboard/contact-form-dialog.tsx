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

interface ContactFormDialogProps {
  recipient: string;
  defaultSubject?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "ghost";
  triggerIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export function ContactFormDialog({
  recipient,
  defaultSubject = "",
  triggerLabel = "Send Message",
  triggerVariant = "default",
  triggerIcon,
  children,
}: ContactFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setSubject(defaultSubject);
    setMessage("");
    setPriority("normal");
    setIsSubmitting(false);
    setIsSuccess(false);
    setError("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      // Reset when dialog closes
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
      const res = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim() || `Message to ${recipient}`,
          description: message.trim(),
          category: "contact",
          priority,
          metadata: { recipient },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `Request failed (${res.status})`);
      }

      setIsSuccess(true);
      setTimeout(() => {
        handleOpenChange(false);
      }, 2000);
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

      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
            Send a Message
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400">
            Your message will be delivered to the relevant team through the CTRL
            support system.
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 motion-safe:animate-in motion-safe:fade-in duration-300">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-emerald-400" aria-hidden="true" />
            </div>
            <p className="text-lg font-bold text-foreground">Message sent successfully</p>
            <p className="text-sm text-slate-400">This dialog will close automatically.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {/* Recipient */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                To
              </label>
              <div>
                <Badge
                  variant="outline"
                  className="border-primary/20 bg-primary/10 text-primary font-semibold px-3 py-1 rounded-lg pointer-events-none"
                >
                  {recipient}
                </Badge>
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <label
                htmlFor="contact-subject"
                className="text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Subject
              </label>
              <Input
                id="contact-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your query"
                className="h-10 rounded-lg bg-background dark:bg-[#04070d]/50 dark:border-white/10 focus-visible:ring-primary"
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label
                htmlFor="contact-message"
                className="text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Message <span className="text-red-400">*</span>
              </label>
              <Textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your query in detail (min. 10 characters)"
                rows={5}
                required
                minLength={10}
                className="rounded-lg bg-background dark:bg-[#04070d]/50 dark:border-white/10 focus-visible:ring-primary resize-none"
              />
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
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
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
              disabled={isSubmitting || message.trim().length < 10}
              className="w-full h-11 rounded-lg font-semibold gap-2 shadow-md transition-transform hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
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
