#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, isAbsolute, join, resolve } from "node:path";

const MAX_PROMPT_CHARS = 280;
const MAX_ASSISTANT_CHARS = 420;
const MAX_TRANSCRIPT_CHARS = 420;
const MAX_GIT_CHARS = 320;
const PROJECT_MEMORY_TURNS = 8;
const SESSION_CONTEXT_TURNS = 3;
const PROJECT_MEMORY_CHARS = 2400;

let sqliteModulePromise;

function clip(text, maxChars) {
	const value = String(text || "")
		.replace(/\s+/g, " ")
		.trim();
	if (!value) return "";
	if (value.length <= maxChars) return value;
	return `${value.slice(0, maxChars - 1).trimEnd()}…`;
}

function isoNow() {
	return new Date().toISOString();
}

function runGit(cwd, args) {
	try {
		const result = spawnSync("git", ["-C", cwd, ...args], {
			encoding: "utf8",
			timeout: 1000,
		});
		return result.status === 0 ? result.stdout.trim() : "";
	} catch {
		return "";
	}
}

function getGitRoot(cwd) {
	return runGit(cwd, ["rev-parse", "--show-toplevel"]);
}

function getBranch(cwd) {
	return runGit(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
}

function getGitSnapshot(cwd) {
	const parts = [];
	const branch = getBranch(cwd);
	const recent = runGit(cwd, ["log", "--oneline", "-3", "--no-decorate"]);
	const diffStat = runGit(cwd, ["diff", "--stat", "--no-color", "HEAD"]);
	if (branch) parts.push(`branch ${branch}`);
	if (recent) parts.push(`recent ${clip(recent, 140)}`);
	if (diffStat) parts.push(`diff ${clip(diffStat, 140)}`);
	return clip(parts.join(" | "), MAX_GIT_CHARS);
}

function extractStrings(value, out) {
	if (!value) return;
	if (typeof value === "string") {
		const text = clip(value, 240);
		if (text) out.push(text);
		return;
	}
	if (Array.isArray(value)) {
		for (const item of value) extractStrings(item, out);
		return;
	}
	if (typeof value === "object") {
		for (const [key, nested] of Object.entries(value)) {
			if (
				key === "text" ||
				key === "content" ||
				key === "prompt" ||
				key === "message" ||
				key === "summary"
			) {
				extractStrings(nested, out);
			}
		}
	}
}

function readTranscriptSnippet(transcriptPath) {
	if (!transcriptPath || !existsSync(transcriptPath)) return "";
	try {
		const raw = readFileSync(transcriptPath, "utf8");
		const tail = raw.split("\n").slice(-80);
		const collected = [];
		for (const line of tail) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			try {
				extractStrings(JSON.parse(trimmed), collected);
			} catch {
				collected.push(trimmed);
			}
		}
		return clip(collected.join(" "), MAX_TRANSCRIPT_CHARS);
	} catch {
		return "";
	}
}

async function loadSqlite() {
	if (!sqliteModulePromise) {
		sqliteModulePromise = import("node:sqlite").catch(() => null);
	}
	return sqliteModulePromise;
}

export async function hasSqliteSupport() {
	const sqlite = await loadSqlite();
	return Boolean(sqlite?.DatabaseSync);
}

function stateDir(home) {
	return join(home, ".codex", "openagentsbtw", "state");
}

export function memoryDbPath(home = process.env.HOME || "") {
	return join(stateDir(home), "memory.sqlite");
}

async function openDatabase(home = process.env.HOME || "") {
	const sqlite = await loadSqlite();
	if (!sqlite?.DatabaseSync) return null;

	mkdirSync(stateDir(home), { recursive: true });
	const db = new sqlite.DatabaseSync(memoryDbPath(home));
	db.exec(`
		PRAGMA foreign_keys = ON;
		CREATE TABLE IF NOT EXISTS projects (
			id INTEGER PRIMARY KEY,
			project_key TEXT NOT NULL UNIQUE,
			project_root TEXT NOT NULL,
			repo_name TEXT NOT NULL,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS sessions (
			id INTEGER PRIMARY KEY,
			project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
			session_id TEXT NOT NULL,
			turn_id TEXT NOT NULL,
			model TEXT,
			cwd TEXT NOT NULL,
			transcript_path TEXT,
			branch TEXT,
			prompt_snippet TEXT,
			assistant_snippet TEXT,
			transcript_snippet TEXT,
			git_snapshot TEXT,
			summary TEXT NOT NULL,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			UNIQUE(project_id, session_id, turn_id)
		);
		CREATE INDEX IF NOT EXISTS sessions_project_updated_idx
			ON sessions (project_id, updated_at DESC);
		CREATE TABLE IF NOT EXISTS project_memory (
			project_id INTEGER PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
			summary TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);
	`);
	return db;
}

export function getProjectIdentity(cwd = process.cwd()) {
	const absoluteCwd = resolve(cwd);
	const gitRoot = getGitRoot(absoluteCwd);
	const projectRoot = gitRoot || absoluteCwd;
	return {
		projectKey: projectRoot,
		projectRoot,
		repoName: basename(projectRoot),
		branch: gitRoot ? getBranch(projectRoot) : "",
	};
}

function ensureProject(db, identity) {
	const now = isoNow();
	db.prepare(
		`INSERT INTO projects (project_key, project_root, repo_name, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?)
		 ON CONFLICT(project_key) DO UPDATE SET
		   project_root = excluded.project_root,
		   repo_name = excluded.repo_name,
		   updated_at = excluded.updated_at`,
	).run(identity.projectKey, identity.projectRoot, identity.repoName, now, now);

	return db
		.prepare("SELECT id FROM projects WHERE project_key = ?")
		.get(identity.projectKey).id;
}

function formatSessionLine(row) {
	const stamp = row.updated_at.replace("T", " ").slice(0, 16);
	const branch = row.branch ? `[${row.branch}] ` : "";
	const prompt = clip(
		row.prompt_snippet || row.transcript_snippet || row.summary,
		90,
	);
	const result = clip(row.assistant_snippet || row.summary, 110);
	return `- ${stamp} ${branch}${prompt}${result ? ` -> ${result}` : ""}`;
}

function rebuildProjectMemory(db, projectId) {
	const rows = db
		.prepare(
			`SELECT updated_at, branch, prompt_snippet, assistant_snippet, transcript_snippet, summary
			 FROM sessions
			 WHERE project_id = ?
			 ORDER BY updated_at DESC
			 LIMIT ?`,
		)
		.all(projectId, PROJECT_MEMORY_TURNS);

	if (!rows.length) {
		db.prepare("DELETE FROM project_memory WHERE project_id = ?").run(
			projectId,
		);
		return "";
	}

	const lines = rows.map(formatSessionLine);
	const summary = clip(lines.join("\n"), PROJECT_MEMORY_CHARS);
	db.prepare(
		`INSERT INTO project_memory (project_id, summary, updated_at)
		 VALUES (?, ?, ?)
		 ON CONFLICT(project_id) DO UPDATE SET
		   summary = excluded.summary,
		   updated_at = excluded.updated_at`,
	).run(projectId, summary, isoNow());
	return summary;
}

export function buildSessionSummary(payload, extras = {}) {
	const branch = extras.branch || "";
	const promptSnippet = clip(payload.prompt, MAX_PROMPT_CHARS);
	const assistantSnippet = clip(
		payload.last_assistant_message,
		MAX_ASSISTANT_CHARS,
	);
	const transcriptSnippet = clip(
		readTranscriptSnippet(payload.transcript_path),
		MAX_TRANSCRIPT_CHARS,
	);
	const gitSnapshot = clip(extras.gitSnapshot, MAX_GIT_CHARS);
	const parts = [];

	if (promptSnippet) parts.push(`Prompt: ${promptSnippet}`);
	if (assistantSnippet) parts.push(`Result: ${assistantSnippet}`);
	if (!assistantSnippet && transcriptSnippet) {
		parts.push(`Transcript: ${transcriptSnippet}`);
	}
	if (branch) parts.push(`Branch: ${branch}`);
	if (gitSnapshot) parts.push(`Git: ${gitSnapshot}`);

	return {
		branch,
		promptSnippet,
		assistantSnippet,
		transcriptSnippet,
		gitSnapshot,
		summary: parts.join("\n") || "No captured session details.",
	};
}

export async function persistTurnMemory(payload, options = {}) {
	const home = options.home || process.env.HOME || "";
	const cwd = payload.cwd || process.cwd();
	if (!payload.transcript_path) {
		return { skipped: "transcript_unavailable" };
	}

	const db = await openDatabase(home);
	if (!db) return { skipped: "sqlite_unavailable" };

	try {
		const identity = getProjectIdentity(cwd);
		const projectId = ensureProject(db, identity);
		const turnId = payload.turn_id || "";
		const session = buildSessionSummary(payload, {
			branch: identity.branch,
			gitSnapshot: getGitSnapshot(identity.projectRoot),
		});
		const now = isoNow();

		db.prepare(
			`INSERT INTO sessions (
				project_id, session_id, turn_id, model, cwd, transcript_path, branch,
				prompt_snippet, assistant_snippet, transcript_snippet, git_snapshot,
				summary, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(project_id, session_id, turn_id) DO UPDATE SET
				model = excluded.model,
				cwd = excluded.cwd,
				transcript_path = excluded.transcript_path,
				branch = excluded.branch,
				prompt_snippet = excluded.prompt_snippet,
				assistant_snippet = excluded.assistant_snippet,
				transcript_snippet = excluded.transcript_snippet,
				git_snapshot = excluded.git_snapshot,
				summary = excluded.summary,
				updated_at = excluded.updated_at`,
		).run(
			projectId,
			payload.session_id || "unknown-session",
			turnId,
			payload.model || "",
			cwd,
			payload.transcript_path || "",
			session.branch,
			session.promptSnippet,
			session.assistantSnippet,
			session.transcriptSnippet,
			session.gitSnapshot,
			session.summary,
			now,
			now,
		);

		const projectSummary = rebuildProjectMemory(db, projectId);
		return {
			summary: session.summary,
			projectSummary,
			projectKey: identity.projectKey,
		};
	} finally {
		db.close();
	}
}

export async function loadProjectMemory(cwd = process.cwd(), options = {}) {
	const home = options.home || process.env.HOME || "";
	const db = await openDatabase(home);
	if (!db) {
		return {
			available: false,
			reason: "sqlite_unavailable",
			projectSummary: "",
			recentSummaries: [],
		};
	}

	try {
		const identity = getProjectIdentity(cwd);
		const project = db
			.prepare("SELECT id FROM projects WHERE project_key = ?")
			.get(identity.projectKey);
		if (!project) {
			return {
				available: true,
				projectSummary: "",
				recentSummaries: [],
				projectKey: identity.projectKey,
			};
		}

		const projectMemory = db
			.prepare("SELECT summary FROM project_memory WHERE project_id = ?")
			.get(project.id);
		const rows = db
			.prepare(
				`SELECT updated_at, branch, prompt_snippet, assistant_snippet, transcript_snippet, summary
				 FROM sessions
				 WHERE project_id = ?
				 ORDER BY updated_at DESC
				 LIMIT ?`,
			)
			.all(project.id, SESSION_CONTEXT_TURNS);

		return {
			available: true,
			projectSummary: projectMemory?.summary || "",
			recentSummaries: rows.map(formatSessionLine),
			projectKey: identity.projectKey,
		};
	} finally {
		db.close();
	}
}

export async function forgetProjectMemory(cwd = process.cwd(), options = {}) {
	const home = options.home || process.env.HOME || "";
	const db = await openDatabase(home);
	if (!db) return false;
	try {
		const identity = getProjectIdentity(cwd);
		const project = db
			.prepare("SELECT id FROM projects WHERE project_key = ?")
			.get(identity.projectKey);
		if (!project) return false;
		db.prepare("DELETE FROM projects WHERE id = ?").run(project.id);
		return true;
	} finally {
		db.close();
	}
}

export async function pruneMemory(options = {}) {
	const home = options.home || process.env.HOME || "";
	const maxSessionsPerProject = options.maxSessionsPerProject || 20;
	const db = await openDatabase(home);
	if (!db) return false;

	try {
		const projects = db.prepare("SELECT id FROM projects").all();
		for (const project of projects) {
			db.prepare(
				`DELETE FROM sessions
				 WHERE id IN (
				   SELECT id FROM sessions
				   WHERE project_id = ?
				   ORDER BY updated_at DESC
				   LIMIT -1 OFFSET ?
				 )`,
			).run(project.id, maxSessionsPerProject);
			rebuildProjectMemory(db, project.id);
		}
		db.exec("VACUUM");
		return true;
	} finally {
		db.close();
	}
}

export function renderMemoryContext(memory, includeRecent = true) {
	if (!memory?.projectSummary && !(memory?.recentSummaries || []).length)
		return "";
	const lines = ["openagentsbtw memory:"];
	if (memory.projectSummary) {
		lines.push("Project recap:");
		lines.push(memory.projectSummary);
	}
	if (includeRecent && memory.recentSummaries.length) {
		lines.push("Recent session notes:");
		lines.push(memory.recentSummaries.join("\n"));
	}
	return lines.join("\n");
}

export async function describeMemory(cwd = process.cwd(), options = {}) {
	const memory = await loadProjectMemory(cwd, options);
	if (!memory.available)
		return "openagentsbtw memory is unavailable: node:sqlite is not available in this Node runtime.";
	if (!memory.projectSummary && !memory.recentSummaries.length) {
		return "No openagentsbtw Codex memory stored for this project yet.";
	}
	return renderMemoryContext(memory, true);
}

export function resolveProjectPath(inputPath, cwd = process.cwd()) {
	if (!inputPath) return cwd;
	return isAbsolute(inputPath) ? inputPath : resolve(cwd, inputPath);
}
