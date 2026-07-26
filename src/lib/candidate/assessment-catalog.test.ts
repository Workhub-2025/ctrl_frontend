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
      title: "Situational Judgement",
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

  it("keeps candidate-facing mechanics and durations aligned with the active releases", () => {
    expect(
      Object.fromEntries(
        candidateAssessmentItems.map(({ slug, title, description, duration }) => [
          slug,
          { title, description, duration },
        ]),
      ),
    ).toEqual({
      "call-simulation": {
        title: "Call Simulation",
        description:
          "Capture caller, system, intelligence and incident information from a live recorded call.",
        duration: "15–20 minutes",
      },
      prioritisation: {
        title: "Prioritisation",
        description:
          "Rank competing incidents by urgency, seriousness, vulnerability, immediacy and potential risk.",
        duration: "35–45 minutes",
      },
      "situational-judgement": {
        title: "Situational Judgement",
        description:
          "Choose the most and least effective response to 20 workplace situations.",
        duration: "30–40 minutes",
      },
      "short-term-memory": {
        title: "Short-Term Memory",
        description:
          "Retain an operational briefing through interruption, reconstruct key facts and correct the record.",
        duration: "25–35 minutes",
      },
      typing: {
        title: "Typing",
        description:
          "Measure typing speed, accuracy and stability across three sustained 90-second passages.",
        duration: "7–10 minutes",
      },
    });
  });
});
