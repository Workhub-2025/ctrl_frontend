import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("client campaign review cache invalidation", () => {
  it("clears each related hiring manager overview after a decision", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/services/client-portal.service.ts"),
      "utf8"
    );

    expect(source).toContain("campaign.users_permissions_users");
    expect(source).toContain("invalidateHmOverviewServerCache(String(id))");
    expect(source).toContain("await Promise.all");
  });
});
