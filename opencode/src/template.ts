import { join } from "node:path";
import { AGENT_META } from "./agents.ts";
import type { AgentRole } from "./models.ts";

const TEMPLATES_DIR = join(import.meta.dir, "..", "templates");

export async function loadAgentSystemPrompt(role: AgentRole): Promise<string> {
	const meta = AGENT_META[role];
	const path = join(TEMPLATES_DIR, "agents", `${meta.greekName}.md`);
	const file = Bun.file(path);
	if (!(await file.exists())) {
		throw new Error(`Agent template not found: ${path}`);
	}
	return file.text();
}

export async function loadTemplateFile(relativePath: string): Promise<string> {
	const path = join(TEMPLATES_DIR, relativePath);
	const file = Bun.file(path);
	if (!(await file.exists())) {
		throw new Error(`Template file not found: ${path}`);
	}
	return file.text();
}
