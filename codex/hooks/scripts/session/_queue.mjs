import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

const QUEUE_DIR = ".config/openagentsbtw/queue";
const JSON_START = "<!-- openagentsbtw-queue-json";
const JSON_END = "-->";
const ENTRY_STATES = new Set(["pending", "auto", "dispatched", "cancelled"]);

function runGit(cwd, args) {
	try {
		const gitOutput = spawnSync("git", ["-C", cwd, ...args], {
			encoding: "utf8",
			timeout: 1000,
		});
		return gitOutput.status === 0 ? gitOutput.stdout.trim() : "";
	} catch {
		return "";
	}
}

function activeHome(customHome) {
	return customHome || process.env.HOME || homedir();
}

function hashProject(identity) {
	return createHash("sha256").update(identity).digest("hex").slice(0, 16);
}

export function resolveQueueProject(cwd = process.cwd()) {
	const projectRoot =
		runGit(cwd, ["rev-parse", "--show-toplevel"]) || resolve(cwd);
	const originUrl = runGit(projectRoot, ["remote", "get-url", "origin"]);
	const identity = `${projectRoot}\n${originUrl}`;
	return {
		root: projectRoot,
		originUrl,
		hash: hashProject(identity),
	};
}

export function queueFilePath(project, options = {}) {
	return join(activeHome(options.home), QUEUE_DIR, `${project.hash}.md`);
}

function emptyQueue(project) {
	return {
		version: 1,
		project,
		records: [],
	};
}

function encodeQueue(queueState) {
	return Buffer.from(JSON.stringify(queueState, null, 2), "utf8").toString(
		"base64url",
	);
}

function decodeQueue(markdown) {
	const startIndex = markdown.indexOf(JSON_START);
	if (startIndex === -1) return null;
	const contentStart = startIndex + JSON_START.length;
	const endIndex = markdown.indexOf(JSON_END, contentStart);
	if (endIndex === -1) return null;
	const encoded = markdown.slice(contentStart, endIndex).trim();
	try {
		return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
	} catch {
		return null;
	}
}

function renderRecords(records) {
	if (!records.length) return "No queued messages.\n";
	return records
		.map((record) => {
			const oneLineMessage = record.message.replace(/\s+/g, " ").trim();
			return `- ${record.id} [${record.state}] ${record.createdAt}: ${oneLineMessage}`;
		})
		.join("\n");
}

function renderQueue(queueState) {
	return [
		"# openagentsbtw Deferred Prompt Queue",
		"",
		`Project: \`${queueState.project.root}\``,
		queueState.project.originUrl
			? `Origin: \`${queueState.project.originUrl}\``
			: "Origin: none",
		`Project hash: \`${queueState.project.hash}\``,
		"",
		`${JSON_START}\n${encodeQueue(queueState)}\n${JSON_END}`,
		"",
		"## Entries",
		"",
		renderRecords(queueState.records),
		"",
	].join("\n");
}

function normalizeQueueState(candidate, project) {
	const records = Array.isArray(candidate?.records) ? candidate.records : [];
	return {
		version: 1,
		project,
		records: records
			.filter(
				(record) =>
					typeof record?.id === "string" &&
					typeof record?.message === "string" &&
					ENTRY_STATES.has(record?.state),
			)
			.map((record) => ({
				id: record.id,
				state: record.state,
				message: record.message,
				createdAt: record.createdAt || new Date(0).toISOString(),
				dispatchedAt: record.dispatchedAt || "",
			})),
	};
}

export function loadQueue(cwd = process.cwd(), options = {}) {
	const project = resolveQueueProject(cwd);
	const filepath = queueFilePath(project, options);
	if (!existsSync(filepath)) return emptyQueue(project);
	try {
		const parsed = decodeQueue(readFileSync(filepath, "utf8"));
		return normalizeQueueState(parsed, project);
	} catch {
		return emptyQueue(project);
	}
}

export function saveQueue(queueState, options = {}) {
	const filepath = queueFilePath(queueState.project, options);
	mkdirSync(dirname(filepath), { recursive: true });
	writeFileSync(filepath, renderQueue(queueState));
	return filepath;
}

function nextId(queueState) {
	const maxId = queueState.records.reduce((highest, record) => {
		const idNumber = Number(record.id.replace(/^q-/, ""));
		return Number.isFinite(idNumber) ? Math.max(highest, idNumber) : highest;
	}, 0);
	return `q-${String(maxId + 1).padStart(4, "0")}`;
}

export function addQueueEntry(message, options = {}) {
	const queueState = loadQueue(options.cwd || process.cwd(), options);
	const normalizedMessage = String(message || "").trim();
	if (!normalizedMessage) {
		return { ok: false, message: "Queue message is empty." };
	}
	const record = {
		id: nextId(queueState),
		state: options.auto ? "auto" : "pending",
		message: normalizedMessage,
		createdAt: new Date().toISOString(),
		dispatchedAt: "",
	};
	queueState.records.push(record);
	const filepath = saveQueue(queueState, options);
	return { ok: true, record, filepath, queueState };
}

export function listQueueEntries(options = {}) {
	return loadQueue(options.cwd || process.cwd(), options).records;
}

export function clearQueueEntries(options = {}) {
	const queueState = loadQueue(options.cwd || process.cwd(), options);
	for (const record of queueState.records) {
		if (record.state === "pending" || record.state === "auto") {
			record.state = "cancelled";
		}
	}
	const filepath = saveQueue(queueState, options);
	return { filepath, queueState };
}

export function retryQueueEntry(id, options = {}) {
	const queueState = loadQueue(options.cwd || process.cwd(), options);
	const record = queueState.records.find((candidate) => candidate.id === id);
	if (!record) return { ok: false, message: `Queue entry not found: ${id}` };
	record.state = options.auto ? "auto" : "pending";
	record.dispatchedAt = "";
	const filepath = saveQueue(queueState, options);
	return { ok: true, record, filepath, queueState };
}

export function takeNextAutoEntry(options = {}) {
	const queueState = loadQueue(options.cwd || process.cwd(), options);
	const record = queueState.records.find(
		(candidate) => candidate.state === "auto",
	);
	if (!record) return null;
	record.state = "dispatched";
	record.dispatchedAt = new Date().toISOString();
	const filepath = saveQueue(queueState, options);
	return { record, filepath, queueState };
}

export function nextPendingEntry(options = {}) {
	return loadQueue(options.cwd || process.cwd(), options).records.find(
		(record) => record.state === "pending",
	);
}

export function summarizePendingQueue(options = {}) {
	const records = listQueueEntries(options).filter(
		(record) => record.state === "pending" || record.state === "auto",
	);
	if (!records.length) return "";
	const lines = records.map(
		(record, index) =>
			`${index + 1}. ${record.id} [${record.state}] ${record.message}`,
	);
	return `Queued openagentsbtw messages pending:\n${lines.join("\n")}\n\nAfter this task, run \`/queue next\` or \`oabtw-codex queue next\` to process one manually.`;
}

export function parseQueueCommand(prompt = "") {
	const trimmed = String(prompt || "").trim();
	if (!trimmed) return null;
	const lower = trimmed.toLowerCase();
	if (lower.startsWith("queue:")) {
		return { action: "add", auto: false, message: trimmed.slice(6).trim() };
	}
	if (lower !== "/queue" && !lower.startsWith("/queue ")) return null;
	const rest = trimmed.slice(6).trim();
	if (!rest) return { action: "error", message: "Queue message is empty." };
	if (rest === "list") return { action: "list" };
	if (rest === "next") return { action: "next" };
	if (rest === "clear") return { action: "clear" };
	if (rest.startsWith("retry ")) {
		return { action: "retry", id: rest.slice(6).trim() };
	}
	if (rest.startsWith("--auto ")) {
		return { action: "add", auto: true, message: rest.slice(7).trim() };
	}
	return { action: "add", auto: false, message: rest };
}

export function formatQueueList(records) {
	if (!records.length) return "openagentsbtw queue is empty.";
	return records
		.map((record) => `${record.id} [${record.state}] ${record.message}`)
		.join("\n");
}
