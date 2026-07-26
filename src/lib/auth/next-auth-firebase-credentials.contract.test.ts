import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("NextAuth Firebase credentials gate", () => {
  it("registers CredentialsProvider only outside Firebase auth mode", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/auth/next-auth-options.ts"),
      "utf8",
    );
    expect(source).toContain("isFirebaseAuthProvider");
    expect(source).toContain(
      "providers: isFirebaseAuthProvider() ? [] : [legacyCredentialsProvider]",
    );
  });
});
