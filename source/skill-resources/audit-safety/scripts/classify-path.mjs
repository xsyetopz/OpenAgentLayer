#!/usr/bin/env node
const path = process.argv[2] ?? "";
if (!path) {
	console.error("usage: classify-path.mjs <path>");
	process.exit(2);
}
const generated =
	/(^|\/)(\.codex|\.claude|\.opencode|opencode\.jsonc|AGENTS\.md|CLAUDE\.md)/.test(
		path,
	);
const source = path.startsWith("source/") || path.startsWith("packages/");
console.log(JSON.stringify({ path, generated, source }, undefined, 2));
