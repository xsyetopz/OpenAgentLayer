#!/usr/bin/env node

import { bunRewrite } from "./_bun-rewrite.mjs";
import { asString, createHookRunner } from "./_runtime.mjs";

const SUPPORTED_COMMANDS = new Map(
	[
		"aws",
		"cargo",
		["cat", "read"],
		"config",
		"curl",
		"deps",
		"diff",
		"discover",
		"docker",
		"dotnet",
		"env",
		"err",
		"find",
		"format",
		"gh",
		"git",
		"glab",
		"go",
		"golangci-lint",
		"grep",
		"gt",
		"jest",
		"json",
		"kubectl",
		"lint",
		"log",
		"ls",
		"mypy",
		"next",
		"pip",
		"playwright",
		"prettier",
		"prisma",
		"psql",
		"pytest",
		"rake",
		["rg", "grep"],
		"read",
		"rspec",
		"rubocop",
		"ruff",
		"session",
		"smart",
		"summary",
		"test",
		"tree",
		"tsc",
		"vitest",
		"wc",
		"wget",
	].map((command) => (Array.isArray(command) ? command : [command, command])),
);

const SHELL_WRAPPERS = new Set(["bash", "sh", "zsh"]);
const SUDO_PREFIX_PATTERN = /^sudo\s+/;
const ENV_PREFIX_PATTERN = /^env\s+(?:[A-Za-z_][A-Za-z0-9_]*=[^\s]+\s+)*/;
const WHITESPACE_PATTERN = /\s+/;

function evaluate(payload) {
	const command = firstCommandText(payload);
	if (!command) {
		return { decision: "pass", reason: "No command text to inspect." };
	}

	const normalized = normalizeCommand(command);
	if (normalized.startsWith("rtk ") || normalized === "rtk") {
		return { decision: "pass", reason: "Command already uses RTK." };
	}

	const rewriteCandidate = shellInnerCommand(normalized) ?? normalized;
	const bunReplacement = bunRewrite(rewriteCandidate);
	if (bunReplacement) {
		return {
			decision: "block",
			reason:
				"Bun supports this Node.js package-manager command; use the Bun form instead.",
			details: [`Use: rtk proxy -- ${bunReplacement}`],
		};
	}

	const executable = commandExecutable(normalized);
	if (!executable) {
		return { decision: "pass", reason: "No executable command found." };
	}

	const rtkExecutable = SUPPORTED_COMMANDS.get(executable);
	if (rtkExecutable) {
		return {
			decision: "block",
			reason: "RTK supports this command; run the RTK form instead.",
			details: [`Use: rtk ${rewriteExecutable(normalized, rtkExecutable)}`],
		};
	}

	return {
		decision: "warn",
		reason:
			"RTK has no native filter for this command; use RTK proxy when command output may be noisy.",
		details: [`Use when useful: rtk proxy -- ${normalized}`],
	};
}

function firstCommandText(payload) {
	return (
		asString(payload.command) ||
		asString(payload.input) ||
		asString(payload.text) ||
		asString(payload.response) ||
		asString(payload.finalResponse)
	);
}

function normalizeCommand(command) {
	const firstLine = command
		.split("\n")
		.map((line) => line.trim())
		.find((line) => line.length > 0);
	if (!firstLine) return "";
	return firstLine
		.replace(SUDO_PREFIX_PATTERN, "")
		.replace(ENV_PREFIX_PATTERN, "")
		.trim();
}

function commandExecutable(command) {
	const tokens = command.split(WHITESPACE_PATTERN).filter(Boolean);
	if (tokens.length === 0) return "";
	if (SHELL_WRAPPERS.has(tokens[0]) && tokens[1] === "-lc") {
		const nested = tokens
			.slice(2)
			.join(" ")
			.replace(/^['"]|['"]$/g, "");
		return commandExecutable(nested);
	}
	return tokens[0];
}

function shellInnerCommand(command) {
	const tokens = command.split(WHITESPACE_PATTERN).filter(Boolean);
	if (SHELL_WRAPPERS.has(tokens[0]) && tokens[1] === "-lc") {
		return tokens
			.slice(2)
			.join(" ")
			.replace(/^['"]|['"]$/g, "");
	}
	return undefined;
}

function rewriteExecutable(command, replacement) {
	const [executable, ...rest] = command
		.split(WHITESPACE_PATTERN)
		.filter(Boolean);
	if (!executable) return replacement;
	return [replacement, ...rest].join(" ");
}

createHookRunner("enforce-rtk-commands", evaluate);
