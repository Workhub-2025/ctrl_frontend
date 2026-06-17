import { describe, expect, it } from "vitest";
import { normalizeRole, resolveAppRole } from "@/lib/auth/role-model";

describe("role-model", () => {
  it("resolves known aliases", () => {
    expect(resolveAppRole("hiring-manager")).toBe("hiring_manager");
    expect(resolveAppRole({ type: "client" })).toBe("client");
  });

  it("returns null for unknown roles", () => {
    expect(resolveAppRole("totally-unknown")).toBeNull();
  });

  it("keeps candidate fallback for legacy normalizeRole callers", () => {
    expect(normalizeRole("totally-unknown")).toBe("candidate");
  });
});
