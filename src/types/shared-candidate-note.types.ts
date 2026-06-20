export type SharedCandidateNoteAuthorRole = "hiring_manager" | "client";

export type SharedCandidateNoteVisibility =
  | "hiring_manager_and_client"
  | "client_only";

export type SharedCandidateNote = {
  documentId: string;
  content: string;
  authorRole: SharedCandidateNoteAuthorRole;
  visibility: SharedCandidateNoteVisibility;
  createdAt?: string | null;
  canDelete?: boolean;
};
