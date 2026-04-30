#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { matchCavemanViolations } from "../_caveman-contract.mjs";
import {
	isMetaFile,
	isProseFile,
	isTestFile,
	matchPlaceholders,
	matchPrototypeScaffolding,
	passthrough,
	readStdin,
	stopBlock,
	systemMessage,
} from "../_lib.mjs";
import { persistTurnMemory } from "../_memory.mjs";
import { readSessionMode } from "../session/_caveman.mjs";
import {
	summarizePendingQueue,
	takeNextAutoEntry,
} from "../session/_queue.mjs";

const ROUTE_MARKER_RE = /^OPENAGENTSBTW_([A-Z_]+)=(.+)$/gm;
const BLOCKED_RE = /(?:^|\n)BLOCKED:\s+\S/m;
const BLOCKED_ATTEMPTED_RE = /(?:^|\n)Attempted:\s+\S/im;
const BLOCKED_EVIDENCE_RE = /(?:^|\n)Evidence:\s+\S/im;
const BLOCKED_NEED_RE = /(?:^|\n)Need:\s+\S/im;
const EXECUTION_SIGNAL_RE =
	/(?:^|\n)(?:\$ |>|PASS|FAIL|stderr|stdout|exit code|command:|running |ran |executed )/im;
const TOOL_EVENT_RE =
	/"(?:tool_name|tool|hookEventName|recipient_name)"\s*:\s*"?(?:Bash|exec_command|functions\.exec_command)/i;
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

function parseBoolean(value, fallback = false) {
	if (value === "true") return true;
	if (value === "false") return false;
	return fallback;
}

function parseContract(prompt = "") {
	const contract = {
		route: "",
		routeKind: "readonly",
		allowBlocked: true,
		allowDocsOnly: true,
		allowTestsOnly: true,
		rejectPrototypeScaffolding: false,
	};

	for (const match of prompt.matchAll(ROUTE_MARKER_RE)) {
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

function readTranscript(transcriptPath) {
	if (!transcriptPath || !existsSync(transcriptPath)) return "";
	try {
		return readFileSync(transcriptPath, "utf8");
	} catch {
		return "";
	}
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
			continue;
		}
		if (isTestFile(file)) {
			buckets.tests.push(file);
			continue;
		}
		if (isProseFile(file)) {
			buckets.docs.push(file);
			continue;
		}
		buckets.production.push(file);
	}

	return buckets;
}

function scanFiles(files, rejectPrototypeScaffolding) {
	const hard = [];
	const hardProse = [];
	const soft = [];
	const prototypeHits = [];

	for (const file of files) {
		if (!existsSync(file) || isMetaFile(file)) continue;
		try {
			const content = readFileSync(file, "utf8");
			const lines = content.split("\n");
			const result = matchPlaceholders(file, lines);
			if (isProseFile(file)) {
				hardProse.push(...result.hard);
			} else if (!isTestFile(file)) {
				hard.push(...result.hard);
			}
			soft.push(...result.soft);
			if (rejectPrototypeScaffolding && !isTestFile(file)) {
				prototypeHits.push(...matchPrototypeScaffolding(file, lines));
			}
		} catch {
			// Ignore binary or unreadable files.
		}
	}

	return { hard, hardProse, soft, prototypeHits };
}

function readAssistantText(data) {
	return String(
		data?.finalResponse ?? data?.response ?? data?.last_assistant_message ?? "",
	);
}

function parseBlockedResult(data, transcript) {
	const assistant = readAssistantText(data);
	const combined = `${assistant}\n${String(transcript || "")}`;
	const blocked = BLOCKED_RE.test(combined);
	if (!blocked) {
		return { blocked: false, valid: false, missing: [] };
	}
	const missing = [];
	if (!BLOCKED_ATTEMPTED_RE.test(combined)) missing.push("Attempted");
	if (!BLOCKED_EVIDENCE_RE.test(combined)) missing.push("Evidence");
	if (!BLOCKED_NEED_RE.test(combined)) missing.push("Need");
	return { blocked: true, valid: missing.length === 0, missing };
}

function hasBlockedResult(data, transcript) {
	const assistant = String(data?.last_assistant_message ?? "");
	return BLOCKED_RE.test(assistant) || BLOCKED_RE.test(transcript);
}

function hasExecutionEvidence(data, transcript) {
	const assistant = String(data?.last_assistant_message ?? "");
	if (
		EXECUTION_SIGNAL_RE.test(assistant) ||
		EXECUTION_SIGNAL_RE.test(transcript)
	) {
		return true;
	}
	return TOOL_EVENT_RE.test(transcript);
}

function continueWithQueuedTask(message) {
	process.stdout.write(
		`${JSON.stringify({ continue: false, stopReason: "openagentsbtw queue dispatch", systemMessage: message })}\n`,
	);
	process.exit(0);
}

function isExplanationOnly(data, transcript) {
	const combined = [
		String(data?.last_assistant_message ?? ""),
		transcript.split("\n").slice(-80).join("\n"),
	]
		.join("\n")
		.trim();
	if (!combined) return false;
	return EXPLANATION_ONLY_RE.some((pattern) => pattern.test(combined));
}

function buildDiffFailure(contract, buckets) {
	const details = [];
	if (!buckets.production.length) {
		if (buckets.docs.length && !contract.allowDocsOnly) {
			details.push(
				`docs-only changes are not accepted on ${contract.route || contract.routeKind} routes`,
			);
		}
		if (buckets.tests.length && !contract.allowTestsOnly) {
			details.push(
				`test-only changes are not accepted on ${contract.route || contract.routeKind} routes`,
			);
		}
		if (!details.length) {
			details.push(
				`no production-code files changed for ${contract.route || contract.routeKind} route`,
			);
		}
	}
	return details;
}

(async () => {
	const data = await readStdin();
	if (!data || data.stop_hook_active) passthrough();

	const memoryResult = await persistTurnMemory(data);
	const cwd = data.cwd || process.cwd();
	const contract = parseContract(data.prompt ?? "");
	const files = modifiedFiles(cwd);
	const transcript = readTranscript(data.transcript_path);
	const buckets = classifyFiles(files);
	const blockedResult = parseBlockedResult(data, transcript);
	const blocked = blockedResult.blocked;
	const executionEvidence = hasExecutionEvidence(data, transcript);
	const explanationOnly = isExplanationOnly(data, transcript);
	const cavemanMode = readSessionMode();
	const cavemanHits =
		cavemanMode === "off"
			? []
			: matchCavemanViolations(data?.last_assistant_message ?? "");
	const { hard, hardProse, soft, prototypeHits } = scanFiles(
		files,
		contract.rejectPrototypeScaffolding,
	);

	if (cavemanHits.length) {
		systemMessage(
			`openagentsbtw Caveman mode (${cavemanMode}) detected prose drift (advisory):\n${cavemanHits.slice(0, 6).join("\n")}\n\nApply the response contract directly (action first, no permission-seeking closer).`,
		);
	}

	if (hard.length) {
		stopBlock(
			`openagentsbtw completion check found placeholder code in modified files:\n${hard.slice(0, 12).join("\n")}`,
		);
	}

	if (prototypeHits.length) {
		stopBlock(
			`openagentsbtw completion check found prototype/demo scaffolding in modified files:\n${prototypeHits.slice(0, 12).join("\n")}`,
		);
	}

	if (blocked && !blockedResult.valid) {
		stopBlock(
			`openagentsbtw completion check rejected weak BLOCKED result: missing ${blockedResult.missing.join(", ")} lines. Use:\nBLOCKED: <single blocker>\nAttempted: <steps already tried>\nEvidence: <exact error/output/path:line>\nNeed: <specific missing dependency/input/decision>`,
		);
	}

	if (contract.routeKind === "edit-required" && !blocked) {
		const diffFailures = buildDiffFailure(contract, buckets);
		if (diffFailures.length) {
			stopBlock(
				`openagentsbtw completion check rejected ${contract.route || "edit-required"} completion:\n- ${diffFailures.join("\n- ")}`,
			);
		}
		if (explanationOnly) {
			stopBlock(
				`openagentsbtw completion check rejected ${contract.route || "edit-required"} completion: the final answer looks explanatory instead of reporting completed work. Edit the requested production code or end with a strict BLOCKED: line.`,
			);
		}
	}

	if (
		contract.routeKind === "execution-required" &&
		!blocked &&
		!executionEvidence
	) {
		stopBlock(
			`openagentsbtw completion check rejected ${contract.route || "execution-required"} completion: execution evidence was not found. Run the command, collect real results, or end with a strict BLOCKED: line.`,
		);
	}

	if (hardProse.length) {
		systemMessage(
			`openagentsbtw completion check found placeholders in prose files (non-blocking):\n${hardProse.slice(0, 12).join("\n")}`,
		);
	}

	if (soft.length) {
		const notes = [
			`openagentsbtw completion check found possible placeholders or hedging in modified files:\n${soft.slice(0, 12).join("\n")}`,
		];
		if (memoryResult?.skipped === "transcript_unavailable") {
			notes.push(
				"openagentsbtw memory skipped this turn because Codex did not expose a transcript path.",
			);
		}
		systemMessage(notes.join("\n\n"));
	}

	if (!files.length && memoryResult?.skipped === "transcript_unavailable") {
		systemMessage(
			"openagentsbtw memory skipped this turn because Codex did not expose a transcript path. Ephemeral or non-persistent sessions will not be recalled later.",
		);
	}

	if (
		files.length &&
		!soft.length &&
		memoryResult?.skipped === "transcript_unavailable"
	) {
		systemMessage(
			"openagentsbtw memory skipped this turn because Codex did not expose a transcript path. Ephemeral or non-persistent sessions will not be recalled later.",
		);
	}

	const autoEntry = takeNextAutoEntry({ cwd });
	if (autoEntry?.record) {
		continueWithQueuedTask(
			`Dispatch queued openagentsbtw message ${autoEntry.record.id}. Treat this as the next user task after the completed task.\n\nTask:\n${autoEntry.record.message}`,
		);
	}
	const queueSummary = summarizePendingQueue({ cwd });
	if (queueSummary) {
		systemMessage(queueSummary);
	}

	passthrough();
})();
