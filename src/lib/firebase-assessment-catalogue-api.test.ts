import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import {
  groupReleasesAsVersionCatalog,
  resolveRequestedAssessmentSlugs,
} from "@/lib/firebase-assessment-catalogue-api";

describe("firebase assessment catalogue helpers", () => {
  it("resolves a single slug or the full Firebase catalogue", () => {
    expect(resolveRequestedAssessmentSlugs("typing")).toEqual(["typing"]);
    expect(resolveRequestedAssessmentSlugs("unknown")).toHaveLength(5);
    expect(resolveRequestedAssessmentSlugs(null)).toHaveLength(5);
  });

  it("groups releases into version options for recovery and client UIs", () => {
    const catalog = groupReleasesAsVersionCatalog(
      [
        {
          id: "a",
          moduleId: "ctrl.typing",
          slug: "typing",
          releaseVersion: "2.0.1",
          status: "retired",
          defaultThreshold: 70,
          manifestHash: "m1",
          contentHash: "c1",
          rubricHash: "r1",
          mediaHash: "media1",
          releaseHash: "rel1",
          publishedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "b",
          moduleId: "ctrl.typing",
          slug: "typing",
          releaseVersion: "2.1.0",
          status: "active",
          defaultThreshold: 70,
          manifestHash: "m2",
          contentHash: "c2",
          rubricHash: "r2",
          mediaHash: "media2",
          releaseHash: "rel2",
          publishedAt: "2026-07-01T00:00:00.000Z",
        },
      ],
      ["typing"],
    );

    expect(catalog.typing).toEqual([
      { version: "2.1.0", title: "v2.1.0", description: null },
      { version: "2.0.1", title: "v2.0.1", description: "Retired" },
    ]);
  });
});

describe("Chunk H Firebase assessment BFF contracts", () => {
  const route = (relativePath: string) =>
    readFileSync(new URL(relativePath, import.meta.url), "utf8");

  it("lists assessment versions from Firebase releases without Strapi", () => {
    const admin = route("../app/api/admin/assessment-versions/route.ts");
    expect(admin).toContain("requireAdminDualAccess");
    expect(admin).toContain("isFirebaseAdminAuth");
    expect(admin).toContain("/v1/assessment-releases");

    for (const source of [
      route("../app/api/assessment/versions/route.ts"),
      route("../app/api/client/assessment-versions/route.ts"),
    ]) {
      expect(source).toContain("requireFirebaseSession");
      expect(source).toContain("loadFirebaseAssessmentVersionCatalog");
      expect(source).not.toMatch(/getAdminAssessmentVersions|requireAdminApiAccess/i);
    }
  });

  it("refreshes platform catalogue from Firebase releases", () => {
    const source = route("../app/api/admin/assessment/platform-sync/route.ts");
    expect(source).toContain("requireAdminDualAccess");
    expect(source).toContain("isFirebaseAdminAuth");
    expect(source).toContain("/v1/assessment-releases");
    expect(source).toContain('mode: "firebase-releases"');
  });

  it("persists integrity events through the Firebase attempt runtime", () => {
    const source = route("../app/api/assessment/integrity-events/route.ts");
    expect(source).toContain("requireFirebaseSession");
    expect(source).toContain("/v1/assessment-runtime/attempts/");
    expect(source).toContain("/events");
    expect(source).not.toContain("getCmsClient");
    expect(source).not.toContain('collection("integrity-events")');
  });

  it("retires the legacy Strapi submit plugin", () => {
    const source = route("../assessments/plugins/submit/handle-assessment-submit.ts");
    expect(source).toContain("410");
    expect(source).toContain("assessment-runtime");
    expect(source).not.toMatch(/getCmsClient|cmsJwt|strapiResultsPath/i);
  });
});
