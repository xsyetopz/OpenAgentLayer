#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, isAbsolute, resolve } from "node:path";

const ALLOWED_EXTENSIONS = new Set(["", ".md", ".mdx", ".txt"]);
const FORBIDDEN_BASENAMES = new Set([
	"makefile",
	"dockerfile",
	"justfile",
	"procfile",
	"gemfile",
	"brewfile",
	"vagrantfile",
]);
const FORBIDDEN_EXTENSIONS = new Set([
	".js",
	".jsx",
	".ts",
	".tsx",
	".json",
	".yaml",
	".yml",
	".toml",
	".env",
	".lock",
	".css",
	".html",
	".xml",
	".sql",
	".sh",
	".bash",
	".zsh",
	".ps1",
	".py",
	".rs",
	".go",
	".java",
	".kt",
	".swift",
	".c",
	".cc",
	".cpp",
	".h",
	".hpp",
]);

const FILLER_PATTERNS = [
	/\b(?:just|really|basically|actually|simply|essentially|generally)\b/gi,
	/\b(?:sure|certainly|of course|happy to|i(?:'d| would) recommend)\b/gi,
	/\b(?:it might be worth|you could consider|it would be good to)\b/gi,
	/\bin order to\b/gi,
	/\bmake sure to\b/gi,
	/\bthe reason is because\b/gi,
	/\b(?:however|furthermore|additionally|in addition)\b/gi,
];

function fail(message) {
	console.error(`Error: ${message}`);
	process.exit(1);
}

function normalizeLine(line) {
	let next = line;
	for (const pattern of FILLER_PATTERNS) {
		next = next.replace(pattern, " ");
	}
	next = next
		.replace(/\byou should\b/gi, "")
		.replace(/\bremember to\b/gi, "")
		.replace(/\s+/g, " ")
		.replace(/\s+([,.;:!?])/g, "$1")
		.trim();
	return next;
}

function compressText(text) {
	const lines = text.split("\n");
	let inFence = false;
	const out = [];

	for (const line of lines) {
		const trimmed = line.trimStart();
		if (trimmed.startsWith("```")) {
			inFence = !inFence;
			out.push(line);
			continue;
		}
		if (inFence || /^\t/.test(line) || /^ {4}/.test(line)) {
			out.push(line);
			continue;
		}
		if (!trimmed) {
			out.push("");
			continue;
		}
		if (/^---\s*$/.test(trimmed) || /^[A-Za-z0-9_-]+:\s/.test(trimmed)) {
			out.push(line);
			continue;
		}
		if (/^#{1,6}\s/.test(trimmed)) {
			out.push(line);
			continue;
		}
		if (/^\|/.test(trimmed)) {
			out.push(line);
			continue;
		}
		const leading = line.match(/^\s*([-*+] |\d+\. )/)?.[0] ?? "";
		const content = leading ? line.slice(leading.length) : line.trimStart();
		const compressed = normalizeLine(content);
		out.push(leading ? `${leading}${compressed}` : compressed);
	}

	return `${out.join("\n").replace(/\n{3,}/g, "\n\n")}\n`;
}

const target = process.argv[2];
if (!target) fail("Missing target path");

const absoluteTarget = isAbsolute(target) ? target : resolve(target);
if (!existsSync(absoluteTarget)) fail(`File not found: ${absoluteTarget}`);
if (absoluteTarget.endsWith(".original.md")) {
	fail("Refusing to compress an .original.md backup");
}

const extension = extname(absoluteTarget).toLowerCase();
const loweredName = basename(absoluteTarget).toLowerCase();
if (!extension && FORBIDDEN_BASENAMES.has(loweredName)) {
	fail(`Unsupported file type: ${loweredName}`);
}
if (FORBIDDEN_EXTENSIONS.has(extension)) {
	fail(`Unsupported file type: ${extension}`);
}
if (!ALLOWED_EXTENSIONS.has(extension)) {
	fail(`Unsupported file type: ${extension || "(extensionless unknown)"}`);
}

const original = readFileSync(absoluteTarget, "utf8");
const compressed = compressText(original);
const backupPath = `${absoluteTarget}.original.md`;
if (!existsSync(backupPath)) {
	writeFileSync(
		backupPath,
		original.endsWith("\n") ? original : `${original}\n`,
	);
}
writeFileSync(absoluteTarget, compressed);

process.stdout.write(
	JSON.stringify({
		ok: true,
		file: absoluteTarget,
		backup: backupPath,
		bytesBefore: Buffer.byteLength(original),
		bytesAfter: Buffer.byteLength(compressed),
		name: basename(absoluteTarget),
	}) + "\n",
);
