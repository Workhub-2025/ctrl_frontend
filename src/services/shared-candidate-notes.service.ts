import "server-only";

import { getStrapiClient } from "@/lib/strapi";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";
import type { SharedCandidateNote } from "@/types/shared-candidate-note.types";

type StrapiListResponse<T> = { data?: T[] };
type StrapiSingleResponse<T> = { data?: T };

type RawNote = {
  documentId?: string;
  content?: string;
  authorId?: string;
  authorRole?: SharedCandidateNote["authorRole"];
  visibility?: SharedCandidateNote["visibility"];
  createdAt?: string | null;
};

async function getCurrentUserDocumentId(strapiJwt: string) {
  const client = getStrapiClient(strapiJwt);
  const response = await client.fetch("/users/me");
  const body = (await response.json().catch(() => ({}))) as {
    documentId?: string;
    id?: number;
  };
  return body.documentId ?? (body.id != null ? String(body.id) : null);
}

function normalizeNote(raw: RawNote, currentUserDocumentId: string | null): SharedCandidateNote {
  const documentId = raw.documentId ?? "";
  return {
    documentId,
    content: raw.content ?? "",
    authorRole: raw.authorRole ?? "client",
    visibility: raw.visibility ?? "hiring_manager_and_client",
    createdAt: raw.createdAt ?? null,
    canDelete: Boolean(
      currentUserDocumentId &&
        raw.authorId &&
        raw.authorId === currentUserDocumentId &&
        documentId
    ),
  };
}

export async function listSharedCandidateNotes(
  sharedCandidateDocumentId: string,
  strapiJwt: string
): Promise<SharedCandidateNote[]> {
  const [response, currentUserDocumentId] = await Promise.all([
    strapiRequest<StrapiListResponse<RawNote>>(
      `/shared-candidates/${encodeURIComponent(sharedCandidateDocumentId)}/notes`
    ),
    getCurrentUserDocumentId(strapiJwt),
  ]);

  return (response.data ?? []).map((note) => normalizeNote(note, currentUserDocumentId));
}

export async function createSharedCandidateNote(
  sharedCandidateDocumentId: string,
  content: string,
  strapiJwt: string
): Promise<SharedCandidateNote | null> {
  const response = await strapiRequest<StrapiSingleResponse<RawNote>>("/notes", {
    method: "POST",
    body: JSON.stringify({ sharedCandidateDocumentId, content }),
  });

  if (!response.data) return null;
  const currentUserDocumentId = await getCurrentUserDocumentId(strapiJwt);
  return normalizeNote(response.data, currentUserDocumentId);
}

export async function deleteSharedCandidateNote(noteDocumentId: string): Promise<void> {
  await strapiRequest(`/notes/${encodeURIComponent(noteDocumentId)}`, {
    method: "DELETE",
  });
}
