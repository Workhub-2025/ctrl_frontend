"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquarePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getSharedCandidateNoteDeleteBffPath,
  getSharedCandidateNotesBffPath,
  type SharedCandidateNotesPortal,
} from "@/lib/shared-candidate-notes-routes";
import type { SharedCandidateNote } from "@/types/shared-candidate-note.types";
import { cn } from "@/lib/utils";

type SharedCandidateNotesPanelProps = {
  sharedCandidateDocumentId: string;
  portal: SharedCandidateNotesPortal;
  className?: string;
};

const AUTHOR_LABELS: Record<SharedCandidateNote["authorRole"], string> = {
  hiring_manager: "Hiring manager",
  client: "Client",
};

export function SharedCandidateNotesPanel({
  sharedCandidateDocumentId,
  portal,
  className,
}: SharedCandidateNotesPanelProps) {
  const [notes, setNotes] = useState<SharedCandidateNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const notesPath = getSharedCandidateNotesBffPath(portal, sharedCandidateDocumentId);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(notesPath, { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as {
        data?: SharedCandidateNote[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(body.error || "Notes could not be loaded");
      }
      setNotes(Array.isArray(body.data) ? body.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Notes could not be loaded");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [notesPath]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const handleAdd = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    setSaving(true);
    setError("");
    try {
      const response = await fetch(notesPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        data?: SharedCandidateNote;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(body.error || "Note could not be saved");
      }
      setContent("");
      await loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Note could not be saved");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteDocumentId: string) => {
    setDeletingId(noteDocumentId);
    setError("");
    try {
      const response = await fetch(getSharedCandidateNoteDeleteBffPath(portal, noteDocumentId), {
        method: "DELETE",
      });
      if (!response.ok && response.status !== 204) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Note could not be deleted");
      }
      setNotes((current) => current.filter((note) => note.documentId !== noteDocumentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Note could not be deleted");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={cn("space-y-3 rounded-xl border border-border/60 bg-background/40 p-4", className)}>
      <div className="flex items-center gap-2">
        <MessageSquarePlus className="h-4 w-4 text-primary" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">Collaboration notes</p>
      </div>
      <p className="text-xs text-muted-foreground">
        {portal === "client"
          ? "Private client notes stay client-only. Hiring manager notes are visible to both sides."
          : "Your notes are visible to the client. Client-only notes are hidden from you."}
      </p>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
          Loading notes…
        </p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li
              key={note.documentId}
              className="rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {AUTHOR_LABELS[note.authorRole]}
                  {note.visibility === "client_only" ? " · Client only" : ""}
                </span>
                {note.canDelete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={deletingId === note.documentId}
                    onClick={() => void handleDelete(note.documentId)}
                    aria-label="Delete note"
                  >
                    {deletingId === note.documentId ? (
                      <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </Button>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap text-foreground">{note.content}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Add a note for your team…"
          rows={3}
          className="resize-none rounded-xl"
        />
        <Button
          type="button"
          size="sm"
          className="rounded-xl font-semibold"
          disabled={saving || !content.trim()}
          onClick={() => void handleAdd()}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            "Add note"
          )}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
