import { describe, expect, it } from "vitest";
import {
  getSharedCandidateNoteDeleteBffPath,
  getSharedCandidateNotesBffPath,
} from "@/lib/shared-candidate-notes-routes";

describe("shared-candidate notes route helpers", () => {
  it("builds client note list and delete paths", () => {
    expect(getSharedCandidateNotesBffPath("client", "sc 1")).toBe(
      "/api/client/shared-candidates/sc%201/notes"
    );
    expect(getSharedCandidateNoteDeleteBffPath("client", "note 9")).toBe(
      "/api/client/notes/note%209"
    );
  });

  it("builds hiring-manager note list and delete paths", () => {
    expect(getSharedCandidateNotesBffPath("hiring_manager", "sc-2")).toBe(
      "/api/hiring-manager/shared-candidates/sc-2/notes"
    );
    expect(getSharedCandidateNoteDeleteBffPath("hiring_manager", "note-2")).toBe(
      "/api/hiring-manager/notes/note-2"
    );
  });
});
