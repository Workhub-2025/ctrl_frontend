import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("NextAuth credentials provider", () => {
  it("does not register a credentials provider", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/auth/next-auth-options.ts"),
      "utf8",
    );
    expect(source).toContain("providers: []");
    expect(source).not.toContain("CredentialsProvider");
    expect(source).not.toContain("legacyCredentialsProvider");
  });
});
