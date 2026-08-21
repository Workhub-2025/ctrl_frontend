#!/usr/bin/env node
/**
 * Hard check: American English in user-facing copy.
 *
 * Live SQL/API identifiers stay American where they are the contract:
 *   organizations, organization_id, organizationId, payment_state canceled (Stripe).
 * CSS `color`, Tailwind `items-center` / `transition-colors`, and HTTP
 * `Authorization` are not English copy and must not be rewritten.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const FORBIDDEN_STRINGS = [
  "Organization membership is required",
  "An active organization seat is required",
  "Organization name confirmation did not match",
  "Organization contact",
  "No organizations yet",
  "Create a client from the organizations page",
  "Organization not found",
  "Organization context is required",
  "Organizations with active platforms",
  "At least one organization field is required",
  "Client organization is required",
  "Organization is not operational",
  "No organization membership",
  "Organization is assigned from your account membership",
  ">Organization<",
  "Unknown fulfillment failure",
  "Seat fulfillment would exceed",
  "fulfillment requires verified",
  "anti-enumeration behavior.",
  "john.smith@organization.com",
];

const FORBIDDEN_PATTERNS = [
  { re: /\blang=["']en["']/, label: 'lang="en" (use lang="en-GB")' },
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === ".next") continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, out);
    else if (/\.(ts|tsx|js|jsx|sql|html)$/.test(name)) out.push(path);
  }
  return out;
}

function filesToScan() {
  try {
    return execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
      .split("\0")
      .filter(Boolean)
      .filter((file) => /\.(ts|tsx|js|jsx|sql|html)$/.test(file))
      .filter((file) => !file.includes("node_modules/") && !file.startsWith("dist/"));
  } catch {
    return walk(process.cwd());
  }
}

const hits = [];
for (const file of filesToScan()) {
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const phrase of FORBIDDEN_STRINGS) {
      if (line.includes(phrase)) {
        hits.push(`${file}:${i + 1}  forbidden American copy: ${JSON.stringify(phrase)}`);
      }
    }
    for (const { re, label } of FORBIDDEN_PATTERNS) {
      re.lastIndex = 0;
      if (re.test(line)) {
        hits.push(`${file}:${i + 1}  ${label}`);
      }
    }
  }
}

if (hits.length > 0) {
  console.error(hits.join("\n"));
  console.error(
    `\nen-GB copy check failed (${hits.length}). Use British spelling in user-facing strings.`,
  );
  process.exit(1);
}

console.log("en-GB user-facing copy check passed.");
