import { describe, expect, it } from "vitest";
import { formatPortalUserLabel, splitDisplayName } from "@/lib/portal-user-label";

describe("formatPortalUserLabel", () => {
  it("formats first name and last initial", () => {
    expect(
      formatPortalUserLabel({ firstName: "Mihir", lastName: "Patel" }),
    ).toBe("Mihir P.");
  });

  it("parses displayName when first/last are missing", () => {
    expect(formatPortalUserLabel({ displayName: "Ada Lovelace" })).toBe("Ada L.");
  });

  it("falls back to email local-part", () => {
    expect(formatPortalUserLabel({ email: "candidate@example.com" })).toBe(
      "candidate",
    );
  });
});

describe("splitDisplayName", () => {
  it("splits multi-word names", () => {
    expect(splitDisplayName("Mihir Patel")).toEqual({
      firstName: "Mihir",
      lastName: "Patel",
    });
  });
});
