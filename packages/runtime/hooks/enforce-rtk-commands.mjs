#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { bunRewrite } from "./_bun-rewrite.mjs";
import { evaluateCommandPolicy } from "./_command-policy.mjs";
import { asString, createHookRunner } from "./_runtime.mjs";

function evaluate(payload) {
	const command = firstCommandText(payload);
	if (!command) {
		return { decision: "pass", reason: "Command text absent" };
	}

	const rtkState = inspectRtkState(payload);
	return evaluateCommandPolicy(command, {
		bunRewrite,
		autoShimSupportedCommands:
			(asString(payload.provider) || process.env["OAL_HOOK_PROVIDER"]) ===
			"codex",
		autoShimAlternateTools:
			(asString(payload.provider) || process.env["OAL_HOOK_PROVIDER"]) ===
			"codex",
		rtkInstalled: rtkState.installed,
		rtkPolicyPresent: rtkState.policyPresent,
	});
}

function inspectRtkState(payload) {
	if (typeof payload.rtkInstalled === "boolean") {
		return {
			installed: payload.rtkInstalled,
			policyPresent:
				typeof payload.rtkPolicyPresent === "boolean"
					? payload.rtkPolicyPresent
					: true,
		};
	}
	return {
		installed: rtkGainWorks(),
		policyPresent: rtkPolicyPresent(asString(payload.cwd) || process.cwd()),
	};
}

function rtkGainWorks() {
	const result = spawnSync("rtk", ["gain"], {
		stdio: "ignore",
		timeout: 1000,
	});
	return result.status === 0;
}

function rtkPolicyPresent(cwd) {
	return rtkPolicyPaths(cwd).some((path) => existsSync(path));
}

function rtkPolicyPaths(cwd) {
	const home = homedir();
	const projectRoot = resolve(cwd);
	return [
		join(home, ".codex/RTK.md"),
		join(home, ".claude/RTK.md"),
		join(home, ".config/opencode/RTK.md"),
		join(projectRoot, "RTK.md"),
		join(projectRoot, ".codex/RTK.md"),
		join(projectRoot, ".claude/RTK.md"),
		join(projectRoot, ".config/opencode/RTK.md"),
	];
}

function firstCommandText(payload) {
	const toolInput = payload.tool_input;
	const explicitCommand =
		asString(payload.command) ||
		asString(toolInput?.command) ||
		asString(toolInput?.cmd);
	if (explicitCommand) return explicitCommand;
	if (!shellToolPayload(payload)) return "";
	return (
		asString(toolInput?.input) ||
		asString(payload.input) ||
		asString(payload.text) ||
		asString(payload.response) ||
		asString(payload.finalResponse)
	);
}

function shellToolPayload(payload) {
	const toolName = (
		asString(payload.tool_name) ||
		asString(payload.toolName) ||
		asString(payload.name) ||
		asString(payload.tool)
	).toLowerCase();
	return [
		"bash",
		"shell",
		"sh",
		"zsh",
		"terminal",
		"shell_command",
		"functions.shell_command",
	].includes(toolName);
}

createHookRunner("enforce-rtk-commands", evaluate);
