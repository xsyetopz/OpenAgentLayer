import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { matchCavemanViolations } from "../_caveman-contract.mjs";
import {
	isMetaFile,
	isProseFile,
	isTestFile,
	loadRouteContracts,
	matchPlaceholders,
	matchPrototypeScaffolding,
} from "../_lib.mjs";
import { readSessionMode } from "../session/_caveman.mjs";

const ROUTE_MARKER_RE = /^OPENAGENTSBTW_([A-Z_]+)=(.+)$/gm;
const BLOCKED_RE = /(?:^|\n)BLOCKED:\s+\S/m;
const EXECUTION_SIGNAL_RE =
	/(?:^|\n)(?:\$ |>|PASS|FAIL|stderr|stdout|exit code|command:|running |ran |executed |test(?:s)? passed|benchmark)/im;
const TOOL_EVENT_RE =
	/"(?:tool_name|hookName|hookEvent|permissionDecisionReason)"\s*:\s*"?(?:Bash|PostToolUse|SubagentStart)/i;
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

function readTranscript(transcriptPath) {
	if (!transcriptPath || !existsSync(transcriptPath)) return "";
	try {
		return readFileSync(transcriptPath, "utf8");
	} catch {
		return "";
	}
}

function parseBoolean(value, fallback = false) {
	if (value === "true") return true;
	if (value === "false") return false;
	return fallback;
}

function parseContractText(text = "") {
	const contract = {
		route: "",
		routeKind: "readonly",
		allowBlocked: true,
		allowDocsOnly: true,
		allowTestsOnly: true,
		rejectPrototypeScaffolding: false,
	};

	for (const match of text.matchAll(ROUTE_MARKER_RE)) {
		const key = match[1];
		const value = match[2].trim();
		switch (key) {
			case "ROUTE":
				contract.route = value;
				break;
			case "CONTRACT":
				contract.routeKind = value;
				break;
			case "ALLOW_BLOCKED":
				contract.allowBlocked = parseBoolean(value, true);
				break;
			case "ALLOW_DOCS_ONLY":
				contract.allowDocsOnly = parseBoolean(value, true);
				break;
			case "ALLOW_TESTS_ONLY":
				contract.allowTestsOnly = parseBoolean(value, true);
				break;
			case "REJECT_PROTOTYPE_SCAFFOLDING":
				contract.rejectPrototypeScaffolding = parseBoolean(value, false);
				break;
			default:
				break;
		}
	}

	return contract;
}

function resolveFallbackContract(data) {
	const contracts = loadRouteContracts();
	const agentType = String(data.agent_type ?? "").trim();
	if (agentType && contracts.agents?.[agentType]) {
		return contracts.agents[agentType];
	}
	return null;
}

function resolveContract(data, transcript) {
	const fromTranscript = parseContractText(transcript);
	if (fromTranscript.route || fromTranscript.routeKind !== "readonly") {
		return fromTranscript;
	}
	return resolveFallbackContract(data) ?? fromTranscript;
}

function classifyFiles(files) {
	const buckets = {
		production: [],
		docs: [],
		tests: [],
		meta: [],
	};

	for (const file of files) {
		if (isMetaFile(file)) {
			buckets.meta.push(file);
		} else if (isTestFile(file)) {
			buckets.tests.push(file);
		} else if (isProseFile(file)) {
			buckets.docs.push(file);
		} else {
			buckets.production.push(file);
		}
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
			const content = readFileSync(file, "utf8");
			const lines = content.split("\n");
			const result = matchPlaceholders(file, lines);
			if (!isProseFile(file) && !isTestFile(file)) {
				hard.push(...result.hard);
			}
			soft.push(...result.soft);
			if (rejectPrototypeScaffolding && !isTestFile(file)) {
				prototypeHits.push(...matchPrototypeScaffolding(file, lines));
			}
		} catch {
			// Ignore unreadable files.
		}
	}

	return { hard, soft, prototypeHits };
}

function hasBlockedResult(data, transcript) {
	const assistant = String(data.last_assistant_message ?? "");
	return BLOCKED_RE.test(assistant) || BLOCKED_RE.test(transcript);
}

function hasExecutionEvidence(data, transcript) {
	const assistant = String(data.last_assistant_message ?? "");
	return (
		EXECUTION_SIGNAL_RE.test(assistant) ||
		EXECUTION_SIGNAL_RE.test(transcript) ||
		TOOL_EVENT_RE.test(transcript)
	);
}

function isExplanationOnly(data, transcript) {
	const combined = [
		String(data.last_assistant_message ?? ""),
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
	const transcriptPath =
		data.agent_transcript_path || data.transcript_path || "";
	const transcript = readTranscript(transcriptPath);
	const contract = resolveContract(data, transcript);
	const files = modifiedFiles(cwd);
	const buckets = classifyFiles(files);
	const blocked = hasBlockedResult(data, transcript);
	const executionEvidence = hasExecutionEvidence(data, transcript);
	const explanationOnly = isExplanationOnly(data, transcript);
	const cavemanMode = readSessionMode();
	const assistantText = String(
		data.finalResponse ?? data.response ?? data.last_assistant_message ?? "",
	);
	const cavemanHits =
		cavemanMode === "off" ? [] : matchCavemanViolations(assistantText);
	const { hard, soft, prototypeHits } = scanFiles(
		files,
		contract.rejectPrototypeScaffolding,
	);

	if (cavemanHits.length > 0) {
		return {
			type: "warn",
			message:
				`openagentsbtw Caveman mode (${cavemanMode}) detected prose drift (advisory):\n` +
				`${cavemanHits.slice(0, 6).join("\n")}\n\n` +
				"Apply the response contract directly (action first, no permission-seeking closer).",
		};
	}

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
			message: `openagentsbtw completion check rejected ${contract.route || "execution-required"} completion: execution evidence was not found. Run the command, collect real results, or end with a strict BLOCKED: line.`,
		};
	}

	if (soft.length > 0) {
		return {
			type: "warn",
			message:
				"openagentsbtw completion check found possible placeholders or hedging in modified files:\n" +
				soft.slice(0, 12).join("\n"),
		};
	}

	return { type: "pass" };
}
