import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SOURCE_DIR = path.resolve(__dirname, "..");

async function readJson(filepath) {
	return JSON.parse(await fs.readFile(filepath, "utf8"));
}

async function isDirectory(filepath) {
	return fs
		.stat(filepath)
		.then((stat) => stat.isDirectory())
		.catch(() => false);
}

function parseMarkdownSections(markdown) {
	const lines = markdown.trim().split(/\r?\n/u);
	const titleLine = lines[0]?.startsWith("# ") ? lines[0].slice(2).trim() : "";
	const sections = [];
	let current = null;

	for (const line of lines.slice(titleLine ? 1 : 0)) {
		const match = line.match(/^## (.+)$/);
		if (match) {
			if (current) {
				sections.push({
					title: current.title,
					body: current.body.join("\n").trim(),
				});
			}
			current = { title: match[1], body: [] };
			continue;
		}
		if (!current) {
			continue;
		}
		current.body.push(line);
	}

	if (current) {
		sections.push({
			title: current.title,
			body: current.body.join("\n").trim(),
		});
	}

	return { title: titleLine, sections };
}

async function readNamedJsonChildren(relativeDir, filename) {
	const dir = path.join(SOURCE_DIR, relativeDir);
	const entries = (await fs.readdir(dir))
		.map((entry) => path.join(dir, entry))
		.filter((entry) => path.basename(entry) !== "catalog");
	const dirs = [];
	for (const entry of entries) {
		if (await isDirectory(entry)) {
			dirs.push(entry);
		}
	}
	dirs.sort((left, right) => left.localeCompare(right));
	return Promise.all(
		dirs.map((dirpath) => readJson(path.join(dirpath, filename))),
	);
}

async function readJsonDir(relativeDir) {
	const dir = path.join(SOURCE_DIR, relativeDir);
	const entries = (await fs.readdir(dir))
		.filter((entry) => entry.endsWith(".json"))
		.sort((left, right) => left.localeCompare(right));
	return Promise.all(entries.map((entry) => readJson(path.join(dir, entry))));
}

export async function loadAgents() {
	const agents = await readNamedJsonChildren("agents", "agent.json");
	return Promise.all(
		agents.map(async (agent) => {
			const prompt = parseMarkdownSections(
				await fs.readFile(
					path.join(SOURCE_DIR, "agents", agent.name, "prompt.md"),
					"utf8",
				),
			);
			return { ...agent, promptSections: prompt.sections };
		}),
	);
}

export async function loadSkills() {
	return readNamedJsonChildren(path.join("skills"), "skill.json");
}

export async function loadCommands() {
	return {
		opencodeCommands: await readJsonDir(path.join("commands", "opencode")),
		copilotPrompts: await readJsonDir(path.join("commands", "copilot")),
		codexModes: await readJsonDir(path.join("commands", "codex")),
	};
}

export async function loadHookPolicies() {
	return readJsonDir(path.join("hooks", "policies"));
}

export async function loadProjectGuidance() {
	const dir = path.join(SOURCE_DIR, "guidance");
	const entries = (await fs.readdir(dir))
		.filter((entry) => entry.endsWith(".md"))
		.sort((left, right) => left.localeCompare(right));
	const records = await Promise.all(
		entries.map(async (entry) => {
			const key = entry.replace(/\.md$/, "");
			const parsed = parseMarkdownSections(
				await fs.readFile(path.join(dir, entry), "utf8"),
			);
			return [key, parsed];
		}),
	);
	return Object.fromEntries(records);
}
