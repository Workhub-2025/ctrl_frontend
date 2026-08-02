#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.argv.includes("--strict");
const report = process.argv.includes("--report");
// Truthful post-decommission baseline (2026-08-02). Ratchet this down with
// each retired compatibility path; strict mode remains the zero-reference gate.
const baseline = 92;
const roots = [
  "src",
  "package.json",
  "package-lock.json",
  "next.config.ts",
  ".env.example",
  ".env.local.example",
].map((path) => join(repositoryRoot, path)).filter(existsSync);
const ignoredDirectories = new Set([
  ".git",
  ".next",
  "dist",
  "node_modules",
]);
const textExtensions = new Set([
  ".cjs", ".css", ".env", ".example", ".html", ".js", ".json", ".jsx",
  ".md", ".mjs", ".ts", ".tsx", ".txt", ".yaml", ".yml",
]);
const rules = [
  { id: "runtime-strapi-url", pattern: /\b(?:NEXT_PUBLIC_)?STRAPI_API_URL\b/g },
  { id: "runtime-strapi-token", pattern: /\bSTRAPI_API_(?:FULL_ACCESS|READONLY)_TOKEN\b/g },
  { id: "strapi-client-package", pattern: /["']@strapi\/client["']/g },
  { id: "strapi-proxy-route", pattern: /\/api\/strapi-proxy\b/g },
  { id: "legacy-cms-proxy-route", pattern: /\/api\/legacy-cms-proxy\b/g },
  { id: "legacy-cms-host", pattern: /\bbe\.ctrl-assess\.co\.uk\b/g },
  { id: "legacy-cms-import", pattern: /(?:from|import\s*\()\s*["'][^"']*legacy-cms[^"']*["']/g },
  { id: "strapi-jwt-reference", pattern: /\bstrapiJwt\b/g },
  {
    id: "strapi-client-helper",
    pattern: /\b(?:getStrapiClient|getServerStrapiClient|strapiRequest|strapiServerClient)\b/g,
  },
  {
    id: "strapi-module-import",
    pattern: /(?:from|import\s*\()\s*["'][^"']*strapi[^"']*["']/g,
  },
];

function walk(path) {
  const entries = readdirSync(path, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const child = join(path, entry.name);
    if (entry.isDirectory()) results.push(...walk(child));
    else if (textExtensions.has(extname(child)) || entry.name.startsWith(".env")) {
      results.push(child);
    }
  }
  return results;
}

const files = roots.flatMap((root) => {
  try {
    return walk(root);
  } catch {
    return [root];
  }
});
const findings = [];
for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  for (const rule of rules) {
    lines.forEach((line, index) => {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(line)) {
        findings.push({
          rule: rule.id,
          file: relative(repositoryRoot, file).replaceAll("\\", "/"),
          line: index + 1,
          excerpt: line.trim().slice(0, 160),
        });
      }
    });
  }
}

console.log(
  `Strapi migration gate: ${findings.length} finding(s); baseline ${baseline}; mode ${strict ? "strict" : "ratchet"}.`,
);
if (report) {
  findings.forEach((finding) => {
    console.log(
      `${finding.rule} ${finding.file}:${finding.line} ${finding.excerpt}`,
    );
  });
}
if (strict && findings.length > 0) {
  console.error("Strict cutover gate failed: all Strapi runtime references must be removed.");
  process.exit(1);
}
if (findings.length > baseline) {
  console.error(
    `Migration regression: ${findings.length - baseline} finding(s) above the ${baseline} baseline.`,
  );
  process.exit(1);
}
console.log(
  findings.length === 0
    ? "PASS: frontend is free of prohibited Strapi runtime references."
    : `PASS: no regression; ${baseline - findings.length} finding(s) removed from the baseline.`,
);
