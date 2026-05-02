#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const paths = process.argv.slice(2);
if (paths.length === 0) {
	console.error("usage: source-evidence-check.mjs <path> [...path]");
	process.exit(2);
}
for (const path of paths) {
	if (!existsSync(path)) {
		console.error(`missing evidence path: ${path}`);
		process.exit(1);
	}
	const content = readFileSync(path, "utf8");
	if (content.trim().length === 0) {
		console.error(`empty evidence path: ${path}`);
		process.exit(1);
	}
}
console.log(`evidence paths ok: ${paths.length}`);
