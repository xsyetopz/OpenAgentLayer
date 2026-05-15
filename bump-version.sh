#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: ./bump-version.sh [--dry-run] <major|minor|patch|x.y.z[-suffix]>
USAGE
}

dry_run=false
if [[ "${1:-}" == "--dry-run" ]]; then
  dry_run=true
  shift
fi
if [[ $# -ne 1 || "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]] && exit 0
  exit 2
fi

node - "$dry_run" "$1" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const dryRun = process.argv[2] === "true";
const requested = process.argv[3];
const root = process.cwd();
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}
function parse(version) {
  const match = semverPattern.exec(version);
  if (!match) fail(`invalid semver: ${version}`);
  return {
    raw: version,
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split(".") : [],
  };
}
function compareIdentifier(a, b) {
  const aNumber = /^\d+$/.test(a);
  const bNumber = /^\d+$/.test(b);
  if (aNumber && bNumber) return Number(a) - Number(b);
  if (aNumber) return -1;
  if (bNumber) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}
function compare(aVersion, bVersion) {
  const a = parse(aVersion);
  const b = parse(bVersion);
  for (const key of ["major", "minor", "patch"]) {
    if (a[key] !== b[key]) return a[key] - b[key];
  }
  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0;
  if (a.prerelease.length === 0) return 1;
  if (b.prerelease.length === 0) return -1;
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const aId = a.prerelease[index];
    const bId = b.prerelease[index];
    if (aId === undefined) return -1;
    if (bId === undefined) return 1;
    const compared = compareIdentifier(aId, bId);
    if (compared !== 0) return compared;
  }
  return 0;
}
function bump(current, increment) {
  const parsed = parse(current);
  if (increment === "major") return `${parsed.major + 1}.0.0`;
  if (increment === "minor") return `${parsed.major}.${parsed.minor + 1}.0`;
  if (increment === "patch") return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  if (semverPattern.test(increment)) return increment;
  fail(`unknown bump target: ${increment}`);
}
function readJsonVersion(relativePath) {
  const file = path.join(root, relativePath);
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  if (typeof parsed.version !== "string") fail(`${relativePath} has no string version`);
  return { path: relativePath, version: parsed.version, kind: "json" };
}
function readClaudeMarketplaceVersion(relativePath) {
  const file = path.join(root, relativePath);
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  const version = parsed.plugins?.[0]?.version;
  if (typeof version !== "string") fail(`${relativePath} has no plugin version`);
  return { path: relativePath, version, kind: "claude-marketplace" };
}
function readRubyVersion(relativePath) {
  const text = fs.readFileSync(path.join(root, relativePath), "utf8");
  const match = /^\s*version\s+"([^"]+)"/m.exec(text);
  if (!match) fail(`${relativePath} has no cask version`);
  return { path: relativePath, version: match[1], kind: "ruby" };
}
function readMarkdownHeadingVersion(relativePath, current) {
  const text = fs.readFileSync(path.join(root, relativePath), "utf8");
  const match = new RegExp(`^## \\[${current.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`, "m").exec(text);
  if (!match) fail(`${relativePath} has no heading for ${current}`);
  return { path: relativePath, version: current, kind: "markdown" };
}
function replaceFile(relativePath, replacer) {
  const file = path.join(root, relativePath);
  const before = fs.readFileSync(file, "utf8");
  const after = replacer(before);
  if (before === after) fail(`${relativePath} was not updated`);
  if (!dryRun) fs.writeFileSync(file, after);
}

const rootVersion = readJsonVersion("package.json").version;
const current = parse(rootVersion).raw;
const locations = [
  readJsonVersion("package.json"),
  readJsonVersion("source/product.json"),
  readJsonVersion("plugins/claude/openagentlayer/.claude-plugin/plugin.json"),
  readJsonVersion("plugins/codex/openagentlayer/.codex-plugin/plugin.json"),
  readJsonVersion("plugins/opencode/openagentlayer/package.json"),
  readRubyVersion("homebrew/Casks/openagentlayer.rb"),
  readClaudeMarketplaceVersion(".claude-plugin/marketplace.json"),
  readMarkdownHeadingVersion("CHANGELOG.md", current),
];

const mismatches = locations.filter((location) => location.version !== current);
if (mismatches.length > 0) {
  fail(`version mismatch before bump:\n${mismatches.map((item) => `- ${item.path}: ${item.version} != ${current}`).join("\n")}`);
}
const next = bump(current, requested);
if (compare(next, current) <= 0) fail(`new version ${next} must be greater than current version ${current}`);

const changed = new Set(locations.map((location) => location.path));
for (const location of locations) {
  if (location.kind === "json") {
    replaceFile(location.path, (text) => text.replace(/"version"\s*:\s*"[^"]+"/, `"version": "${next}"`));
  } else if (location.kind === "ruby") {
    replaceFile(location.path, (text) => text.replace(/^\s*version\s+"[^"]+"/m, `  version "${next}"`));
  } else if (location.kind === "markdown") {
    replaceFile(location.path, (text) => text.replace(new RegExp(`^## \\[${current.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`, "m"), `## [${next}]`));
  } else if (location.kind === "claude-marketplace") {
    replaceFile(location.path, (text) => text.replace(/"version"\s*:\s*"[^"]+"/, `"version": "${next}"`));
  }
}

console.log(`${dryRun ? "DRY RUN " : ""}OAL version ${current} -> ${next}`);
for (const file of [...changed].sort()) console.log(`- ${file}`);
NODE
