import type { SourceFile, SourceGraph } from "./source";

export function composeAgentPrompt(
	graph: SourceGraph,
	agent: SourceFile,
	platform: string,
): string {
	const rolePrompt = rolePromptFor(graph, agent);
	const displayName = String(agent.data["display_name"]);
	const id = String(agent.data["id"]);
	const route = String(agent.data["model_route"]);
	const role = String(agent.data["role"]);
	return [
		`# ${displayName}`,
		"",
		"## Identity",
		"",
		`You are ${displayName}, the OpenAgentLayer ${id} agent for ${platform}.`,
		`Route: ${route}.`,
		`Role: ${role}`,
		"",
		demoteMarkdownHeadings(rolePrompt.data.trim(), 1),
		"",
		...graph.promptModules.flatMap((module) => [
			demoteMarkdownHeadings(module.data.trim(), 1),
			"",
		]),
	].join("\n");
}

export function composeModelInstructions(graph: SourceGraph): string {
	return [
		"# OpenAgentLayer",
		"",
		...graph.workflows.map(renderWorkflow),
		...graph.promptModules.flatMap((module) => [
			demoteMarkdownHeadings(module.data.trim(), 1),
			"",
		]),
	].join("\n");
}

export function demoteMarkdownHeadings(
	markdown: string,
	levels: number,
): string {
	return markdown
		.split("\n")
		.map((line) => {
			const headingLength = markdownHeadingLength(line);
			if (headingLength === 0) {
				return line;
			}
			const heading = "#".repeat(Math.min(6, headingLength + levels));
			return `${heading}${line.slice(headingLength)}`;
		})
		.join("\n");
}

function markdownHeadingLength(line: string): number {
	let length = 0;
	for (const char of line) {
		if (char !== "#") {
			break;
		}
		length += 1;
	}
	if (length === 0 || length > 6 || line[length] !== " ") {
		return 0;
	}
	return length;
}

export function rolePromptFor(
	graph: SourceGraph,
	agent: SourceFile,
): SourceFile<string> {
	const promptPath = String(agent.data["prompt_path"]);
	const prompt = graph.agentPrompts.find((file) => file.path === promptPath);
	if (!prompt) {
		throw new Error(`${promptPath} is required`);
	}
	return prompt;
}

function renderWorkflow(workflow: SourceFile): string {
	const steps = workflow.data["steps"] as string[];
	return [
		`## ${workflow.data["id"]}`,
		"",
		String(workflow.data["description"]),
		"",
		...steps.map((step, index) => `${index + 1}. ${step}`),
		"",
	].join("\n");
}
