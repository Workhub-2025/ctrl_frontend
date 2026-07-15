import { describe, expect, it } from "vitest";

import { candidateAssessmentItems } from "@/assessments/plugins/candidate-catalog";
import { resolveCandidateAssessmentCatalogItem } from "@/lib/candidate/assessment-catalog";

describe("resolveCandidateAssessmentCatalogItem", () => {
  it.each(candidateAssessmentItems)(
    "maps $slug to its own candidate metadata",
    (catalogueItem) => {
      const resolved = resolveCandidateAssessmentCatalogItem({
        slug: catalogueItem.slug,
        name: catalogueItem.title,
      });

      expect(resolved.resolvedSlug).toBe(catalogueItem.slug);
      expect(resolved.item).toMatchObject({
        slug: catalogueItem.slug,
        title: catalogueItem.title,
        description: catalogueItem.description,
        duration: catalogueItem.duration,
      });
    }
  );

  it("maps a legacy display name onto the replacement module with the same slug", () => {
    const resolved = resolveCandidateAssessmentCatalogItem({
      name: "Situational Judgement Assessment",
    });

    expect(resolved.resolvedSlug).toBe("situational-judgement");
    expect(resolved.item).toMatchObject({
      slug: "situational-judgement",
      title: "Situational Judgement v2",
    });
  });

  it("exposes every active replacement module", () => {
    expect(candidateAssessmentItems.map((item) => item.slug)).toEqual([
      "call-simulation",
      "prioritisation",
      "situational-judgement",
      "short-term-memory",
      "typing",
    ]);
  });
});
