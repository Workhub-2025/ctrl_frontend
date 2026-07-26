import { describe, expect, it } from "vitest";
import {
  readAssessmentSettingVersion,
  resolveCatalogueReleaseId,
} from "@/lib/hiring-manager/resolve-assessment-release";

describe("resolveCatalogueReleaseId", () => {
  const releases = [
    { releaseId: "rel-101", releaseVersion: "1.0.1", status: "active" },
    { releaseId: "rel-110", releaseVersion: "1.1.0", status: "active" },
  ];

  it("falls back to the active release when version is omitted", () => {
    expect(
      resolveCatalogueReleaseId({
        slug: "typing",
        selectedVersion: undefined,
        fallbackReleaseId: "rel-101",
        availableReleases: releases,
      }),
    ).toBe("rel-101");
  });

  it("maps semver onto the matching release id", () => {
    expect(
      resolveCatalogueReleaseId({
        slug: "call-simulation",
        selectedVersion: "1.1.0",
        fallbackReleaseId: "rel-101",
        availableReleases: releases,
      }),
    ).toBe("rel-110");
  });

  it("rejects unknown versions", () => {
    expect(() =>
      resolveCatalogueReleaseId({
        slug: "typing",
        selectedVersion: "9.9.9",
        fallbackReleaseId: "rel-101",
        availableReleases: releases,
      }),
    ).toThrow(/9\.9\.9/);
  });
});

describe("readAssessmentSettingVersion", () => {
  it("reads nested slug version settings", () => {
    expect(
      readAssessmentSettingVersion(
        { typing: { version: "1.0.1", threshold: 70 }, weights: { typing: 1 } },
        "typing",
      ),
    ).toBe("1.0.1");
  });
});
