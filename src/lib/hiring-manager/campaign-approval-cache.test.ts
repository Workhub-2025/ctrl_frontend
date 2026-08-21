import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("client campaign review", () => {
  it("reviews through the domain API recruitment session", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/app/api/client/campaign-approvals/[campaignId]/review/route.ts",
      ),
      "utf8",
    );

    expect(source).toContain("requireFirebaseRecruitmentSession");
    expect(source).toContain("recruitment.reviewCampaign");
  });
});
