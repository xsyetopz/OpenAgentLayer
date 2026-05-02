#!/usr/bin/env node

import { asArray, asObject, asString, createHookRunner } from "./_runtime.mjs";

const SENTINEL_PATTERNS = [
	/\bTODO\s*:/,
	/\bFIXME\s*:/,
	/\bTBD\s*:/,
	/\bHACK\s*:/,
	/\bXXX\s*:/,
	/\btodo!\s*\(/,
	/\bunimplemented!\s*\(/,
	/\bunreachable!\s*\(/,
	/\bNotImplemented(?:Error|Exception)\b/,
	/throw\s+new\s+Error\s*\(\s*(["'`])TODO\b/,
];

const PROSE_EXTENSIONS = new Set(["md", "mdx", "rst", "txt"]);

function isProsePath(path) {
	const extension = path.split(".").at(-1)?.toLowerCase();
	return extension ? PROSE_EXTENSIONS.has(extension) : false;
}

function collectContent(payload) {
	const files = asArray(payload.files).map((entry) => {
		const file = asObject(entry);
		return {
			path: asString(file.path),
			content: asString(file.content),
			prose: file.prose === true || isProsePath(asString(file.path)),
		};
	});

	if (files.length > 0) {
		return files;
	}

	const text =
		asString(payload.text) ||
		asString(payload.content) ||
		asString(payload.response);
	return [{ path: "inline-input", content: text, prose: false }];
}

function findSentinel(content) {
	for (const pattern of SENTINEL_PATTERNS) {
		const match = content.match(pattern);
		if (match) {
			return match[0];
		}
	}

	return "";
}

function evaluate(payload) {
	const violations = [];
	const warnings = [];

	for (const item of collectContent(payload)) {
		if (!item.content) {
			continue;
		}

		const sentinel = findSentinel(item.content);
		if (!sentinel) {
			continue;
		}

		if (item.prose) {
			warnings.push(`${item.path}: ${sentinel}`);
		} else {
			violations.push(`${item.path}: ${sentinel}`);
		}
	}

	if (violations.length > 0) {
		return {
			decision: "block",
			reason: "Unresolved sentinel marker detected in production artifact.",
			details: violations,
		};
	}

	if (warnings.length > 0) {
		return {
			decision: "warn",
			reason: "Unresolved sentinel marker detected in prose artifact.",
			details: warnings,
		};
	}

	return {
		decision: "pass",
		reason: "No unresolved sentinel markers detected.",
	};
}

createHookRunner("block-sentinel-markers", evaluate);
