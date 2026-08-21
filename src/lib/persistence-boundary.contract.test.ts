import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = join(process.cwd(), "src");

function productionSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return productionSourceFiles(path);
    if (![".ts", ".tsx"].includes(extname(entry.name))) return [];
    if (/\.(?:test|spec)\.[^.]+$/.test(entry.name)) return [];
    return [path];
  });
}

describe("frontend persistence boundary", () => {
  it("does not import Firestore, Realtime Database, or Data Connect clients", () => {
    const forbiddenImports = [
      /from\s+["'](?:@firebase|firebase)\/firestore(?:\/[^"']*)?["']/,
      /from\s+["'](?:@firebase|firebase)\/database(?:\/[^"']*)?["']/,
      /from\s+["'](?:@firebase|firebase)\/data-connect(?:\/[^"']*)?["']/,
    ];

    for (const path of productionSourceFiles(sourceRoot)) {
      const source = readFileSync(path, "utf8");
      for (const forbidden of forbiddenImports) {
        expect(source, path).not.toMatch(forbidden);
      }
    }
  });

  it("keeps assessment persistence behind the same-origin BFF", () => {
    const route = readFileSync(
      join(sourceRoot, "app/api/assessment-runtime/[...segments]/route.ts"),
      "utf8",
    );
    const adapter = readFileSync(
      join(sourceRoot, "lib/assessment-runtime-server.ts"),
      "utf8",
    );

    expect(route).toContain("forwardAssessmentRuntime");
    expect(adapter).toContain("auth.domainApi.request");
    expect(adapter).toContain("firebaseSessionCookie");
    expect(adapter).not.toMatch(/firebase\/firestore|data-connect|\bpg\b/);
  });
});
