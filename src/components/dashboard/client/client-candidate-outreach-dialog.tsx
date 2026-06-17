"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CheckCircle, Loader2, Send } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ClientOutreachTemplateKey,
  ClientOutreachTemplates,
  ClientSharedCandidate,
} from "@/services/client-portal.service";

const TEMPLATE_OPTIONS: Array<{ key: ClientOutreachTemplateKey; label: string }> = [
  { key: "inperson", label: "In-person interview invite" },
  { key: "phone", label: "Phone call scheduling request" },
];

type ClientCandidateOutreachDialogProps = {
  candidate: ClientSharedCandidate;
  children: ReactNode;
};

export function ClientCandidateOutreachDialog({
  candidate,
  children,
}: ClientCandidateOutreachDialogProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<ClientOutreachTemplates | null>(null);
  const [templateKey, setTemplateKey] = useState<ClientOutreachTemplateKey>("inperson");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const applyTemplate = useCallback(
    (key: ClientOutreachTemplateKey, source: ClientOutreachTemplates) => {
      setTemplateKey(key);
      setSubject(source[key].subject);
      setBody(source[key].body);
    },
    []
  );

  const resetState = useCallback(() => {
    setTemplates(null);
    setTemplateKey("inperson");
    setSubject("");
    setBody("");
    setLoadingTemplates(false);
    setSending(false);
    setSuccess(false);
    setError("");
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadingTemplates(true);
    setError("");

    void fetch(
      `/api/client/shared-candidates/${encodeURIComponent(candidate.documentId)}/message-templates`
    )
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          data?: ClientOutreachTemplates;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error || "Templates could not be loaded");
        }
        if (cancelled) return;
        const loaded = payload.data ?? {
          inperson: { subject: "", body: "" },
          phone: { subject: "", body: "" },
        };
        setTemplates(loaded);
        applyTemplate("inperson", loaded);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Templates could not be loaded");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTemplates(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, candidate.documentId, applyTemplate]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setTimeout(resetState, 300);
    }
  };

  const handleTemplateChange = (key: ClientOutreachTemplateKey) => {
    if (!templates) return;
    applyTemplate(key, templates);
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError("Subject and message are required.");
      return;
    }

    setSending(true);
    setError("");

    try {
      const response = await fetch(
        `/api/client/shared-candidates/${encodeURIComponent(candidate.documentId)}/message`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: subject.trim(),
            body: body.trim(),
            templateKey,
          }),
        }
      );

      const payload = (await response.json().catch(() => ({}))) as {
        data?: { sent?: string[]; failed?: string[] };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Message could not be sent");
      }

      if ((payload.data?.sent ?? []).length === 0) {
        throw new Error("No message was delivered. Check the candidate email address.");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message could not be sent");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg rounded-2xl">
        {success ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">Message sent</DialogTitle>
              <DialogDescription>
                Your email to {candidate.candidateName} has been sent.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle className="h-10 w-10 text-emerald-500" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                The candidate can reply directly to your email address.
              </p>
              <Button className="rounded-xl" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">Send message</DialogTitle>
              <DialogDescription>
                Email {candidate.candidateName} about {candidate.campaignName}. You can edit the
                subject and body before sending.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`template-${candidate.documentId}`}>Template</Label>
                <Select
                  value={templateKey}
                  onValueChange={(value) =>
                    handleTemplateChange(value as ClientOutreachTemplateKey)
                  }
                  disabled={loadingTemplates || sending || !templates}
                >
                  <SelectTrigger id={`template-${candidate.documentId}`} className="rounded-xl">
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_OPTIONS.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`subject-${candidate.documentId}`}>Subject</Label>
                <Input
                  id={`subject-${candidate.documentId}`}
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  disabled={loadingTemplates || sending}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`body-${candidate.documentId}`}>Message</Label>
                <Textarea
                  id={`body-${candidate.documentId}`}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  disabled={loadingTemplates || sending}
                  rows={8}
                  className="rounded-xl resize-y"
                />
              </div>

              {loadingTemplates ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Loading templates…
                </p>
              ) : null}

              {error ? <p className="text-sm text-red-500">{error}</p> : null}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => handleOpenChange(false)}
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button
                  className="gap-2 rounded-xl font-semibold"
                  onClick={() => void handleSend()}
                  disabled={loadingTemplates || sending || !candidate.candidateEmail}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden="true" />
                  )}
                  Send email
                </Button>
              </div>

              {!candidate.candidateEmail ? (
                <p className="text-xs text-muted-foreground">
                  This candidate has no email address on file.
                </p>
              ) : null}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
