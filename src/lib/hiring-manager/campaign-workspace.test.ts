import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("hiring-manager campaign workspace", () => {
  it("keeps campaign operations in four campaign-scoped tabs", () => {
    const source = readSource(
      "src/components/dashboard/hiring-manager-campaign-detail.tsx"
    );

    for (const tab of ["overview", "candidates", "sessions", "assessments"]) {
      expect(source).toContain(`id: "${tab}"`);
      expect(source).toContain(`activeTab === "${tab}"`);
    }
    expect(source).toContain("HiringManagerSessionCreatePanel");
    expect(source).toContain("View all candidates");
  });

  it("removes sessions as a primary navigation destination", () => {
    const navigation = readSource("src/lib/hm-nav.ts");
    expect(navigation).not.toContain('label: "Sessions"');
    expect(navigation).not.toContain('href: "/hiring-manager-dashboard/sessions"');
  });

  it("redirects legacy session-list links into their campaign workspace", () => {
    const route = readSource(
      "src/app/hiring-manager-dashboard/sessions/page.tsx"
    );
    expect(route).toContain("?tab=sessions");
    expect(route).toContain('redirect("/hiring-manager-dashboard/campaigns")');
  });
});
