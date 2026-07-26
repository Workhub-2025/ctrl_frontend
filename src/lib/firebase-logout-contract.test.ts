import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Firebase logout contract", () => {
  it("attempts upstream revocation before clearing either local cookie", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/api/auth/logout/route.ts"),
      "utf8",
    );
    const revoke = source.indexOf(".logout(firebaseSessionCookie)");
    const clearNextAuth = source.indexOf("clearSessionCookie(response)");
    const clearFirebase = source.indexOf("clearFirebaseSessionCookie(response)");

    expect(revoke).toBeGreaterThan(-1);
    expect(revoke).toBeLessThan(clearNextAuth);
    expect(revoke).toBeLessThan(clearFirebase);
    expect(source).toContain("upstream revocation failed");
  });
});

