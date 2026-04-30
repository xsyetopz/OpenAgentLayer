#!/usr/bin/env node
import "../suppress-stderr.mjs";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import {
	AI_PROSE_SLOP,
	COMMENT_SLOP_PATTERNS,
	isProseFile,
	isTestFile,
	matchPrototypeScaffolding,
	PLACEHOLDER_EMPTY_BODY,
	PLACEHOLDER_HARD,
	passthrough,
	postWarn,
	readStdin,
	SUPPRESSION_PATTERNS,
	SYCOPHANCY_PATTERNS,
} from "../_lib.mjs";

function which(cmd) {
	for (const dir of (process.env.PATH || "").split(":")) {
		const p = join(dir, cmd);
		if (existsSync(p)) return p;
	}
	return null;
}

const FORMATTERS = {
	py: [
		["ruff", "format", "--quiet"],
		["black", "--quiet"],
	],
	go: [["gofmt", "-w"]],
	rs: [["rustfmt", "--edition", "2021"]],
	ts: [
		["prettier", "--write"],
		["deno", "fmt"],
	],
	tsx: [
		["prettier", "--write"],
		["deno", "fmt"],
	],
	js: [
		["prettier", "--write"],
		["deno", "fmt"],
	],
	jsx: [
		["prettier", "--write"],
		["deno", "fmt"],
	],
	swift: [["swift-format", "format", "--in-place"]],
	cpp: [["clang-format", "-i"]],
	cc: [["clang-format", "-i"]],
	cxx: [["clang-format", "-i"]],
	c: [["clang-format", "-i"]],
	h: [["clang-format", "-i"]],
	hpp: [["clang-format", "-i"]],
};

function getToolFileAndContent(data) {
	const toolName = data.tool_name || "";
	const toolInput = data.tool_input || {};
	const filePath = toolInput.file_path || "";
	let content = "";
	if (toolName === "Write") {
		content = toolInput.content || "";
	} else if (toolName === "Edit") {
		content = toolInput.new_string || "";
	} else if (toolName === "MultiEdit") {
		const edits = toolInput.edits || [];
		content = edits.map((e) => e.new_string || "").join("\n");
	}
	return { filePath, content };
}

function hasProjectConfig(cmd) {
	const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
	switch (cmd) {
		case "prettier":
			return (
				existsSync(join(dir, "node_modules/.bin/prettier")) ||
				existsSync(join(dir, ".prettierrc")) ||
				existsSync(join(dir, ".prettierrc.json")) ||
				existsSync(join(dir, ".prettierrc.js")) ||
				existsSync(join(dir, ".prettierrc.yaml"))
			);
		case "deno":
			return (
				existsSync(join(dir, "deno.json")) ||
				existsSync(join(dir, "deno.jsonc"))
			);
		default:
			return true;
	}
}

function runFormatter(filePath) {
	const ext = extname(filePath).replace(/^\./, "");
	if (!ext || !existsSync(filePath)) return null;
	const candidates = FORMATTERS[ext] || [];
	for (const cmdParts of candidates) {
		if (!which(cmdParts[0])) continue;
		if (!hasProjectConfig(cmdParts[0])) continue;
		try {
			const before = readFileSync(filePath);
			spawnSync(cmdParts[0], [...cmdParts.slice(1), filePath], {
				encoding: "utf8",
				timeout: 30000,
			});
			const after = readFileSync(filePath);
			if (!before.equals(after)) return cmdParts[0];
			return null;
		} catch {
			// try next formatter
		}
	}
	return null;
}

function placeholderPatterns(content, filePath) {
	if (isTestFile(filePath)) return [];
	const allPatterns = [...PLACEHOLDER_HARD, ...PLACEHOLDER_EMPTY_BODY];
	return allPatterns
		.filter((pat) => pat.test(content))
		.map((pat) => pat.source);
}

function prototypePatterns(content, filePath) {
	if (isTestFile(filePath)) return [];
	return matchPrototypeScaffolding(filePath, content.split("\n"))
		.slice(0, 5)
		.map((hit) => hit.replace(/^\s+/, ""));
}

function slopPatterns(content, filePath) {
	const hits = [];
	for (const pat of COMMENT_SLOP_PATTERNS) {
		if (pat.test(content)) {
			hits.push("narrating comment");
			break;
		}
	}
	// AI prose slop: prose files only (common code identifiers cause false positives)
	if (isProseFile(filePath)) {
		for (const pat of AI_PROSE_SLOP) {
			if (pat.test(content)) hits.push(pat.source);
		}
	}
	return hits.slice(0, 5);
}

function suppressionPatterns(content, filePath) {
	if (isTestFile(filePath)) return [];
	return SUPPRESSION_PATTERNS.filter((pat) => pat.test(content)).map(
		(pat) => pat.source,
	);
}

function sycophancyPatterns(content) {
	return SYCOPHANCY_PATTERNS.filter((pat) => pat.test(content))
		.map((pat) => pat.source)
		.slice(0, 5);
}

(async () => {
	try {
		const data = await readStdin();
		if (!data || !Object.keys(data).length) passthrough();

		const { filePath, content } = getToolFileAndContent(data);
		if (!filePath) passthrough();

		const formatterUsed = runFormatter(filePath);
		const formatNote = formatterUsed
			? ` [format] File was auto-formatted by ${formatterUsed}. Your output was adjusted.`
			: "";

		if (!content) {
			if (formatNote) postWarn(formatNote.trim());
			passthrough();
		}

		const placeholders = placeholderPatterns(content, filePath);
		if (placeholders.length) {
			postWarn(
				`Placeholder code in ${basename(filePath)}: ` +
					`${placeholders.slice(0, 3).join(", ")}. ` +
					`Finish the implementation.${formatNote}`,
			);
		}

		const prototypeHits = prototypePatterns(content, filePath);
		if (prototypeHits.length) {
			postWarn(
				`Prototype/demo scaffolding in ${basename(filePath)}: ` +
					`${prototypeHits.slice(0, 3).join(", ")}. ` +
					`Replace it with production code that matches the requested behavior.${formatNote}`,
			);
		}

		const suppressions = suppressionPatterns(content, filePath);
		if (suppressions.length) {
			postWarn(
				`Lint suppression in ${basename(filePath)}: ` +
					`${suppressions.slice(0, 3).join(", ")}. ` +
					`Fix the root cause instead of suppressing. ` +
					`If this is a verified false positive, add a comment explaining why.${formatNote}`,
			);
		}

		const prose = isProseFile(filePath);
		const slop = slopPatterns(content, filePath);
		if (slop.length) {
			postWarn(
				`Comment/prose slop in ${basename(filePath)} ` +
					`(${slop.slice(0, 3).join(", ")}). ` +
					`Remove narrating comments and AI filler.${formatNote}`,
			);
		}

		if (prose) {
			const syco = sycophancyPatterns(content);
			if (syco.length) {
				postWarn(
					`Sycophantic phrasing in ${basename(filePath)} ` +
						`(${syco.slice(0, 3).join(", ")}). ` +
						`Remove filler openers and apology phrases.${formatNote}`,
				);
			}
		}

		if (formatNote) postWarn(formatNote.trim());
		passthrough();
	} catch {
		passthrough();
	}
})();
