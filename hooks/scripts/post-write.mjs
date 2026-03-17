#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import {
	AI_PROSE_SLOP,
	COMMENT_SLOP_PATTERNS,
	deny,
	isProseFile,
	isTestFile,
	PLACEHOLDER_HARD,
	passthrough,
	readStdin,
	SYCOPHANCY_PATTERNS,
	warn,
} from "./_lib.mjs";

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

function which(cmd) {
	try {
		execFileSync("which", [cmd], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

function getToolFileAndContent(data) {
	const toolName = data.tool_name ?? "";
	const toolInput = data.tool_input ?? {};
	const filePath = toolInput.file_path ?? "";
	let content = "";
	if (toolName === "Write") content = toolInput.content ?? "";
	else if (toolName === "Edit") content = toolInput.new_string ?? "";
	return [filePath, content];
}

function runFormatter(filePath) {
	const ext = extname(filePath).replace(/^\./, "");
	if (!ext || !existsSync(filePath)) return null;
	const candidates = FORMATTERS[ext] ?? [];
	for (const cmdParts of candidates) {
		if (!which(cmdParts[0])) continue;
		try {
			const before = readFileSync(filePath);
			spawnSync(cmdParts[0], [...cmdParts.slice(1), filePath], {
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
	return PLACEHOLDER_HARD.filter((pat) => pat.test(content)).map(
		(pat) => pat.source,
	);
}

function slopPatterns(content) {
	const hits = [];
	if (COMMENT_SLOP_PATTERNS.some((pat) => pat.test(content))) {
		hits.push("narrating comment");
	}
	for (const pat of AI_PROSE_SLOP) {
		if (pat.test(content)) hits.push(pat.source);
	}
	return hits.slice(0, 5);
}

function sycophancyPatterns(content) {
	return SYCOPHANCY_PATTERNS.filter((pat) => pat.test(content))
		.map((pat) => pat.source)
		.slice(0, 5);
}

const data = readStdin();
if (!data) passthrough();

const [filePath, content] = getToolFileAndContent(data);
if (!filePath) passthrough();

const formatterUsed = runFormatter(filePath);
const formatNote = formatterUsed
	? ` [format] File was auto-formatted by ${formatterUsed}. Your output was adjusted.`
	: "";

if (!content) {
	if (formatNote) warn(formatNote.trim());
	passthrough();
}

const placeholders = placeholderPatterns(content, filePath);
if (placeholders.length > 0) {
	deny(
		`Placeholder code in ${basename(filePath)}: ` +
			`${placeholders.slice(0, 3).join(", ")}. ` +
			`Finish the implementation.${formatNote}`,
		"PostToolUse",
	);
}

const prose = isProseFile(filePath);
const slop = slopPatterns(content);
if (slop.length > 0) {
	const slopMsg =
		`Comment/prose slop in ${basename(filePath)} ` +
		`(${slop.slice(0, 3).join(", ")}). ` +
		`Remove narrating comments and AI filler.${formatNote}`;
	if (prose) warn(slopMsg);
	else deny(slopMsg, "PostToolUse");
}

if (prose) {
	const syco = sycophancyPatterns(content);
	if (syco.length > 0) {
		warn(
			`Sycophantic phrasing in ${basename(filePath)} ` +
				`(${syco.slice(0, 3).join(", ")}). ` +
				`Remove filler openers and apology phrases.${formatNote}`,
		);
	}
}

if (formatNote) warn(formatNote.trim());
passthrough();
