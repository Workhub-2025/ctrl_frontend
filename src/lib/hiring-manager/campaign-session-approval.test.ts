import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  canCreateSessionForCampaign,
  getSessionCreationApprovalError,
} from "@/lib/hiring-manager/campaign-session-approval";

describe("campaign session approval", () => {
  it("allows sessions for approved campaigns", () => {
    expect(canCreateSessionForCampaign("Approved")).toBe(true);
    expect(getSessionCreationApprovalError("Approved")).toBeNull();
  });

  it("blocks sessions while client approval is pending", () => {
    expect(canCreateSessionForCampaign("Pending approval")).toBe(false);
    expect(getSessionCreationApprovalError("Pending approval")).toBe(
      "This campaign must be approved by the client before a session can be created."
    );
  });

  it("blocks rejected campaigns with a distinct explanation", () => {
    expect(canCreateSessionForCampaign("Rejected")).toBe(false);
    expect(getSessionCreationApprovalError("Rejected")).toBe(
      "This campaign was rejected and cannot accept sessions."
    );
  });

  it("keeps the session BFF approval-aware and bounds stored text", () => {
    const route = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/app/api/hiring-manager/sessions/route.ts"
      ),
      "utf8"
    );

    expect(route).toContain("canCreateSessionForCampaign");
    expect(route).toContain("getHiringManagerCampaignDetail");
    expect(route).toContain("sanitisePlainText");
    expect(route).toContain("containsHtmlMarkup");
    expect(route).toContain("candidateLimit > 500");
  });
});
