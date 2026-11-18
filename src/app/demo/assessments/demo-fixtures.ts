import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The assessment demos run only in local development. The fixtures are the
 * live item bank (without answers) and are never part of a deployment.
 */
export const assessmentDemosEnabled = process.env.NODE_ENV === "development";

const fixturesDir = join(process.cwd(), ".demo-fixtures");

export type DemoIndexEntry = { slug: string; title: string; releaseVersion: string };

export async function readDemoFile(name: string): Promise<Buffer | null> {
  if (!assessmentDemosEnabled || !/^[a-z0-9-]+\.(json|mp3|m4a)$/.test(name)) return null;
  return readFile(join(fixturesDir, name)).catch(() => null);
}

export async function readDemoIndex(): Promise<DemoIndexEntry[] | null> {
  const file = await readDemoFile("index.json");
  return file ? (JSON.parse(file.toString("utf8")) as DemoIndexEntry[]) : null;
}
