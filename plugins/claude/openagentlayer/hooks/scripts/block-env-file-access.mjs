#!/usr/bin/env node

import {
	asArray,
	asObject,
	asString,
	createHookRunner,
	uniqueValues,
} from "./_runtime.mjs";

const SECRET_PATH_PATTERNS = [
	/(^|\/)\.env(\.[^/\s]+)?$/i,
	/\.pem$/i,
	/\.key$/i,
	/(^|\/)id_rsa$/i,
	/(^|\/)id_ed25519$/i,
];

const WHITESPACE_PATTERN = /\s+/;
const QUOTE_EDGE_PATTERN = /^['"]|['"]$/g;

const SECRET_VALUE_PATTERNS = [
	/\bAKIA[0-9A-Z]{16}\b/g,
	/\bghp_[A-Za-z0-9]{36,}\b/g,
	/\bsk-[A-Za-z0-9]{20,}\b/g,
	/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
	/\bAIza[0-9A-Za-z\\-_]{35}\b/g,
];

function extractCommand(payload) {
	return (
		asString(payload.command) ||
		asString(payload.toolCommand) ||
		asString(payload.input) ||
		asString(payload.rawCommand)
	);
}

function extractPotentialPaths(payload) {
	const paths = [];
	for (const path of asArray(payload.paths)) {
		paths.push(asString(path));
	}

	for (const entry of asArray(payload.files)) {
		const file = asObject(entry);
		paths.push(asString(file.path));
	}

	const command = extractCommand(payload);
	if (command) {
		for (const token of command.split(WHITESPACE_PATTERN)) {
			if (token.includes("/") || token.includes(".")) {
				paths.push(token.replace(QUOTE_EDGE_PATTERN, ""));
			}
		}
	}

	return paths.filter(Boolean);
}

function extractText(payload) {
	return (
		asString(payload.output) ||
		asString(payload.stdout) ||
		asString(payload.text) ||
		asString(payload.response)
	);
}

function evaluate(payload) {
	if (payload.allowSecretAccess === true) {
		return {
			decision: "warn",
			reason: "Secret access allowed by explicit override.",
		};
	}

	const blockedPaths = uniqueValues(
		extractPotentialPaths(payload).filter((path) =>
			SECRET_PATH_PATTERNS.some((pattern) => pattern.test(path)),
		),
	);

	if (blockedPaths.length > 0) {
		return {
			decision: "block",
			reason: "Secret file access blocked.",
			details: blockedPaths,
		};
	}

	const text = extractText(payload);
	if (!text) {
		return {
			decision: "pass",
			reason: "No secret-like file path or output detected.",
		};
	}

	const leakedTokens = uniqueValues(
		SECRET_VALUE_PATTERNS.flatMap((pattern) => text.match(pattern) ?? []),
	);

	if (leakedTokens.length > 0) {
		return {
			decision: "block",
			reason: "Potential secret value detected in output.",
			details: leakedTokens.map((token) => `${token.slice(0, 6)}…`),
		};
	}

	return {
		decision: "pass",
		reason: "No secret-like file path or output detected.",
	};
}

createHookRunner("block-env-file-access", evaluate);
