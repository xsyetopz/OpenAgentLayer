#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const upstreamConfigPath = join(
	root,
	"third_party/gitleaks/config/gitleaks.toml",
);
const patchPath = join(root, "patches/gitleaks-toml.patch");
const outputPath = join(root, "packages/runtime/hooks/_gitleaks-rules.mjs");
const check = process.argv.includes("--check");
const RULE_SPLIT_PATTERN = /^\[\[rules\]\]\s*$/m;

const patchedConfig = await patchedGitleaksConfig();
const generated = renderRules(parseRules(patchedConfig));
if (check) {
	const current = await readFile(outputPath, "utf8");
	if (current !== generated) {
		throw new Error(
			"Gitleaks rule drift: packages/runtime/hooks/_gitleaks-rules.mjs",
		);
	}
	console.log("Gitleaks rule sync OK");
} else {
	await writeFile(outputPath, generated);
	console.log(`Synced ${outputPath}`);
}

async function patchedGitleaksConfig() {
	const tempRoot = await mkdtemp(join(tmpdir(), "oal-gitleaks-rules-"));
	try {
		await mkdir(join(tempRoot, "config"), { recursive: true });
		await writeFile(
			join(tempRoot, "config/gitleaks.toml"),
			await readFile(upstreamConfigPath, "utf8"),
		);
		const result = spawnSync("git", ["apply", patchPath], {
			cwd: tempRoot,
			encoding: "utf8",
		});
		if (result.status !== 0)
			throw new Error(result.stderr || "failed to apply Gitleaks OAL patch");
		return await readFile(join(tempRoot, "config/gitleaks.toml"), "utf8");
	} finally {
		await rm(tempRoot, { recursive: true, force: true });
	}
}

function parseRules(toml) {
	return toml
		.split(RULE_SPLIT_PATTERN)
		.slice(1)
		.map(parseRule)
		.filter((rule) => rule.id && (rule.regex || rule.path))
		.map(convertRule)
		.filter(Boolean)
		.sort((a, b) => a.id.localeCompare(b.id));
}

function parseRule(block) {
	return {
		id: value(block, "id"),
		description: value(block, "description"),
		regex: value(block, "regex"),
		path: value(block, "path"),
		keywords: array(block, "keywords"),
	};
}

function value(block, key) {
	const quoted = block.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, "m"));
	if (quoted) return quoted[1];
	const literal = block.match(
		new RegExp(`^${key}\\s*=\\s*'''([\\s\\S]*?)'''`, "m"),
	);
	return literal?.[1] ?? "";
}

function array(block, key) {
	const match = block.match(
		new RegExp(`^${key}\\s*=\\s*\\[([\\s\\S]*?)\\]`, "m"),
	);
	if (!match) return [];
	return [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
}

function convertRule(rule) {
	const regex = rule.regex ? convertPattern(rule.regex) : undefined;
	const path = rule.path ? convertPattern(rule.path) : undefined;
	if (rule.regex && !regex) return undefined;
	if (rule.path && !path) return undefined;
	return { ...rule, ...(regex ? { regex } : {}), ...(path ? { path } : {}) };
}

function convertPattern(source) {
	let flags = "g";
	let pattern = source;
	if (pattern.includes("(?i")) flags = "gi";
	pattern = pattern
		.replaceAll("[[:alnum:]]", "A-Za-z0-9")
		.replaceAll("[[:xdigit:]]", "A-Fa-f0-9")
		.replaceAll("[[:alpha:]]", "A-Za-z")
		.replaceAll("[[:digit:]]", "0-9")
		.replace(/\(\?i:([^()]*)\)/g, "(?:$1)")
		.replace(/\(\?-i:([^()]*)\)/g, "(?:$1)")
		.replaceAll("(?i)", "")
		.replaceAll("(?m)", "")
		.replaceAll("\\A", "^")
		.replaceAll("\\z", "$");
	try {
		new RegExp(pattern, flags);
	} catch {
		return undefined;
	}
	return { source: pattern, flags };
}

function renderRules(rules) {
	return `// biome-ignore-all lint: synced upstream Gitleaks rule payload\n// biome-ignore-all format: synced upstream Gitleaks rule payload\n// Synced from third_party/gitleaks/config/gitleaks.toml plus patches/gitleaks-toml.patch\n// Run: bun scripts/sync-gitleaks-rules.mjs\n\nexport const GITLEAKS_RULES = ${JSON.stringify(rules, undefined, "\t")};\n`;
}
