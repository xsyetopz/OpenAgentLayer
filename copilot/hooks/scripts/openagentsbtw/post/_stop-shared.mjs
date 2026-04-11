#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import {
	isMetaFile,
	isProseFile,
	isTestFile,
	loadRouteContracts,
	matchPlaceholders,
	matchPrototypeScaffolding,
	resolveTranscriptPath,
} from "../_lib.mjs";
import { parseRouteMarkers } from "../session/_route-context.mjs";

const BLOCKED_RE = /(?:^|\n)BLOCKED:\s+\S/m;
const EXECUTION_SIGNAL_RE =
	/(?:^|\n)(?:\$ |>|PASS|FAIL|stderr|stdout|exit code|command:|running |ran |executed |test(?:s)? passed|benchmark)/im;
const TOOL_EVENT_RE =
	/"(?:toolName|tool_name|hookName|hookEvent|permissionDecisionReason)"\s*:\s*"?(?:bash|shell|preToolUse|postToolUse|subagentStart)/i;
const EXPLANATION_ONLY_RE = [
	/\bhere(?:'s| is) how\b/i,
	/\bi would\b/i,
	/\byou can\b/i,
	/\bthe approach is\b/i,
	/\bi recommend\b/i,
	/\bwithout changing\b/i,
	/\bconceptually\b/i,
];

function gitLines(cwd, args) {
	try {
		const result = spawnSync("git", ["-C", cwd, ...args], {
			encoding: "utf8",
			timeout: 5000,
		});
		if (result.status !== 0) return [];
		return result.stdout.trim().split("\n").filter(Boolean);
	} catch {
		return [];
	}
}

function modifiedFiles(cwd) {
	return [
		...new Set([
			...gitLines(cwd, ["diff", "--name-only", "HEAD"]),
			...gitLines(cwd, ["diff", "--cached", "--name-only"]),
		]),
	];
}

function readTranscript(path) {
	if (!path || !existsSync(path)) return "";
	try {
		return readFileSync(path, "utf8");
	} catch {
		return "";
	}
}

function resolveFallbackContract(data) {
	const contracts = loadRouteContracts();
	const agentName = String(data.agentName ?? data.agent_name ?? "").trim();
	if (agentName && contracts.agents?.[agentName]) {
		return contracts.agents[agentName];
	}
	return null;
}

function resolveContract(data, transcript) {
	const inline = parseRouteMarkers(transcript);
	if (inline.route || inline.routeKind !== "readonly") return inline;
	return resolveFallbackContract(data) ?? inline;
}

function classifyFiles(files) {
	const buckets = {
		production: [],
		docs: [],
		tests: [],
		meta: [],
	};
	for (const file of files) {
		if (isMetaFile(file)) buckets.meta.push(file);
		else if (isTestFile(file)) buckets.tests.push(file);
		else if (isProseFile(file)) buckets.docs.push(file);
		else buckets.production.push(file);
	}
	return buckets;
}

function scanFiles(files, rejectPrototypeScaffolding) {
	const hard = [];
	const soft = [];
	const prototypeHits = [];
	for (const file of files) {
		if (!existsSync(file) || isMetaFile(file)) continue;
		try {
			const lines = readFileSync(file, "utf8").split("\n");
			const result = matchPlaceholders(file, lines);
			if (!isProseFile(file) && !isTestFile(file)) {
				hard.push(...result.hard);
			}
			soft.push(...result.soft);
			if (rejectPrototypeScaffolding && !isTestFile(file)) {
				prototypeHits.push(...matchPrototypeScaffolding(file, lines));
			}
		} catch {
			// ignore unreadable files
		}
	}
	return { hard, soft, prototypeHits };
}

function hasBlockedResult(data, transcript) {
	const assistant = String(data.finalResponse ?? data.response ?? "");
	return BLOCKED_RE.test(assistant) || BLOCKED_RE.test(transcript);
}

function hasExecutionEvidence(data, transcript) {
	const assistant = String(data.finalResponse ?? data.response ?? "");
	return (
		EXECUTION_SIGNAL_RE.test(assistant) ||
		EXECUTION_SIGNAL_RE.test(transcript) ||
		TOOL_EVENT_RE.test(transcript)
	);
}

function isExplanationOnly(data, transcript) {
	const combined = [
		String(data.finalResponse ?? data.response ?? ""),
		transcript.split("\n").slice(-80).join("\n"),
	]
		.join("\n")
		.trim();
	if (!combined) return false;
	return EXPLANATION_ONLY_RE.some((pattern) => pattern.test(combined));
}

function buildDiffFailure(contract, buckets) {
	if (buckets.production.length > 0) return "";
	if (buckets.docs.length > 0 && !contract.allowDocsOnly) {
		return `docs-only changes are not accepted on ${contract.route || contract.routeKind} routes`;
	}
	if (buckets.tests.length > 0 && !contract.allowTestsOnly) {
		return `test-only changes are not accepted on ${contract.route || contract.routeKind} routes`;
	}
	return `no production-code files changed for ${contract.route || contract.routeKind} route`;
}

export function runStopChecks(data) {
	const cwd = data.cwd || process.cwd();
	const transcript = readTranscript(resolveTranscriptPath(data));
	const contract = resolveContract(data, transcript);
	const files = modifiedFiles(cwd);
	const buckets = classifyFiles(files);
	const blocked = hasBlockedResult(data, transcript);
	const executionEvidence = hasExecutionEvidence(data, transcript);
	const explanationOnly = isExplanationOnly(data, transcript);
	const { hard, soft, prototypeHits } = scanFiles(
		files,
		contract.rejectPrototypeScaffolding,
	);

	if (hard.length > 0) {
		return {
			type: "block",
			message:
				"openagentsbtw completion check found placeholder code in modified files:\n" +
				hard.slice(0, 12).join("\n"),
		};
	}

	if (prototypeHits.length > 0) {
		return {
			type: "block",
			message:
				"openagentsbtw completion check found prototype/demo scaffolding in modified files:\n" +
				prototypeHits.slice(0, 12).join("\n"),
		};
	}

	if (contract.routeKind === "edit-required" && !blocked) {
		const diffFailure = buildDiffFailure(contract, buckets);
		if (diffFailure) {
			return {
				type: "block",
				message:
					`openagentsbtw completion check rejected ${contract.route || "edit-required"} completion:\n- ` +
					diffFailure,
			};
		}
		if (explanationOnly) {
			return {
				type: "block",
				message: `openagentsbtw completion check rejected ${contract.route || "edit-required"} completion: the final answer looks explanatory instead of reporting completed work. Edit the requested production code or end with a strict BLOCKED: line.`,
			};
		}
	}

	if (
		contract.routeKind === "execution-required" &&
		!blocked &&
		!executionEvidence
	) {
		return {
			type: "block",
			message: `openagentsbtw completion check rejected ${contract.route || "execution-required"} completion: execution evidence is required. Run the needed validation or end with a strict BLOCKED: line.`,
		};
	}

	if (soft.length > 0) {
		return {
			type: "context",
			message:
				"openagentsbtw completion check found possible placeholders or hedging in modified files:\n" +
				soft.slice(0, 12).join("\n"),
		};
	}

	return { type: "pass" };
}
