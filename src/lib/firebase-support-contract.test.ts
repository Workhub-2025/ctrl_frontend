import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("firebase support ticket contract", () => {
  it("routes every browser support call through the Firebase BFF", () => {
    const service = readFileSync(
      join(process.cwd(), "src/services/support-ticket.service.ts"),
      "utf8"
    );
    expect(service).not.toContain("NEXT_PUBLIC_AUTH_PROVIDER");
    expect(service).toContain("/api/");
    expect(service).toContain("support-tickets");
  });

  it("exposes ticket BFF routes for create, mine, stats, thread and escalation", () => {
    const routes = [
      "src/app/api/support-tickets/route.ts",
      "src/app/api/support-tickets/mine/route.ts",
      "src/app/api/support-tickets/stats/route.ts",
      "src/app/api/support-tickets/[id]/route.ts",
      "src/app/api/support-tickets/[id]/messages/route.ts",
      "src/app/api/support-tickets/[id]/confirm-resolution/route.ts",
      "src/app/api/support-tickets/[id]/escalate/route.ts",
      "src/lib/firebase-support-api.ts",
      "src/lib/firebase-support-bff.ts"
    ];
    for (const relativePath of routes) {
      const contents = readFileSync(join(process.cwd(), relativePath), "utf8");
      expect(contents.length).toBeGreaterThan(50);
    }
  });
});
