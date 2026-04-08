import { existsSync } from "node:fs";
import { join } from "node:path";
import { AGENT_META } from "./agents.ts";
import type { AgentRole } from "./models.ts";

const DEFAULT_TEMPLATES_DIR = join(import.meta.dir, "..", "templates");
const BUILD_FALLBACK_TEMPLATES_DIR = join(
	import.meta.dir,
	"..",
	"..",
	"..",
	".build",
	"generated",
	"opencode",
	"templates",
);

export function resolveTemplatesDir(): string {
	const explicit = process.env["OABTW_OPENCODE_TEMPLATES_DIR"];
	if (explicit) {
		return explicit;
	}
	if (existsSync(DEFAULT_TEMPLATES_DIR)) {
		return DEFAULT_TEMPLATES_DIR;
	}
	if (existsSync(BUILD_FALLBACK_TEMPLATES_DIR)) {
		return BUILD_FALLBACK_TEMPLATES_DIR;
	}
	return DEFAULT_TEMPLATES_DIR;
}

export async function loadAgentSystemPrompt(role: AgentRole): Promise<string> {
	const meta = AGENT_META[role];
	const path = join(resolveTemplatesDir(), "agents", `${meta.greekName}.md`);
	const file = Bun.file(path);
	if (!(await file.exists())) {
		throw new Error(`Agent template not found: ${path}`);
	}
	return file.text();
}

export async function loadTemplateFile(relativePath: string): Promise<string> {
	const path = join(resolveTemplatesDir(), relativePath);
	const file = Bun.file(path);
	if (!(await file.exists())) {
		throw new Error(`Template file not found: ${path}`);
	}
	return file.text();
}
