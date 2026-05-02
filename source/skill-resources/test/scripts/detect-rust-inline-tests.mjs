#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const INLINE_TEST_MODULE_PATTERN =
	/(?:#\s*\[cfg\s*\(\s*test\s*\)\s*\]\s*)?mod\s+tests\s*\{/m;

const roots = process.argv.slice(2);
if (roots.length === 0) roots.push(".");
const offenders = [];

for (const root of roots) scan(root);

if (offenders.length > 0) {
	console.error(
		"Rust inline test modules are forbidden. Use `mod tests;` plus `foo/tests.rs`.",
	);
	for (const offender of offenders) console.error(offender);
	process.exit(1);
}
console.log("No Rust inline test modules found.");

function scan(path) {
	const stats = statSync(path);
	if (stats.isDirectory()) {
		if ([".git", "node_modules", "target"].includes(path.split("/").at(-1)))
			return;
		for (const entry of readdirSync(path)) scan(join(path, entry));
		return;
	}
	if (!path.endsWith(".rs")) return;
	const text = readFileSync(path, "utf8");
	if (INLINE_TEST_MODULE_PATTERN.test(text)) offenders.push(path);
}
