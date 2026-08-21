import { execFileSync } from "node:child_process";

const trackedSourceFiles = execFileSync(
  "git",
  ["ls-files", "-z", "--", "src"],
  { encoding: "utf8" }
)
  .split("\0")
  .filter(Boolean);

const duplicateSuffix = / \d+\.(?:[cm]?[jt]sx?)$/i;
const duplicateSources = trackedSourceFiles.filter((file) =>
  duplicateSuffix.test(file)
);

if (duplicateSources.length > 0) {
  console.error(
    [
      "Tracked duplicate-suffixed source files are not allowed.",
      "Rename or remove the duplicate before merging:",
      ...duplicateSources.map((file) => `  - ${file}`),
    ].join("\n")
  );
  process.exit(1);
}

console.log(
  `Source hygiene passed (${trackedSourceFiles.length} tracked source files checked).`
);

execFileSync("node", ["scripts/check-en-gb-spelling.mjs"], {
  stdio: "inherit",
});
