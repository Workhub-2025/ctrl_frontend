import { generatedAssessmentRenderers } from "./registry.generated";

const bySlug = new Map(generatedAssessmentRenderers.map((renderer) => [renderer.slug, renderer]));

export function getAssessmentRenderer(slug: string) {
  return bySlug.get(slug);
}

export function listAssessmentModuleSlugs() {
  return [...bySlug.keys()];
}

export function supportsReleaseMajor(slug: string, releaseVersion: string) {
  const major = Number.parseInt(releaseVersion.split(".")[0] ?? "", 10);
  return getAssessmentRenderer(slug)?.supportedMajorVersions.includes(major) ?? false;
}
