export type SharedCandidateNotesPortal = "client" | "hiring_manager";

export function getSharedCandidateNotesBffPath(
  portal: SharedCandidateNotesPortal,
  sharedCandidateId: string
) {
  const encoded = encodeURIComponent(sharedCandidateId);
  return portal === "client"
    ? `/api/client/shared-candidates/${encoded}/notes`
    : `/api/hiring-manager/shared-candidates/${encoded}/notes`;
}

export function getSharedCandidateNoteDeleteBffPath(
  portal: SharedCandidateNotesPortal,
  noteDocumentId: string
) {
  const encoded = encodeURIComponent(noteDocumentId);
  return portal === "client"
    ? `/api/client/notes/${encoded}`
    : `/api/hiring-manager/notes/${encoded}`;
}
