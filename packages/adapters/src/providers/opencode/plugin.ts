import type { PolicyRecord } from "@openagentlayer/types";
import { OPENCODE_ARTIFACT_ROOT, OPENCODE_SURFACE } from "./constants";

export function renderOpenCodePlugin(
	policies: readonly PolicyRecord[],
): string {
	const handlers = policies
		.filter((record) => record.surfaces.includes(OPENCODE_SURFACE))
		.map(renderOpenCodeHandler)
		.join("\n");
	return [
		'import type { Plugin } from "@opencode-ai/plugin";',
		"",
		'export const openAgentLayerSurface = "opencode";',
		"",
		"async function runPolicy(script: string, payload: unknown): Promise<{ context?: Record<string, unknown>; decision?: string }> {",
		'\tconst process = Bun.spawn(["bun", script], {',
		'\t\tstdin: "pipe",',
		'\t\tstdout: "pipe",',
		'\t\tstderr: "pipe",',
		"\t});",
		"\tprocess.stdin.write(JSON.stringify(payload));",
		"\tprocess.stdin.end();",
		"\tconst [exitCode, stdout] = await Promise.all([process.exited, new Response(process.stdout).text()]);",
		"\tif (exitCode !== 0) {",
		"\t\tthrow new Error(stdout);",
		"\t}",
		"\treturn JSON.parse(stdout);",
		"}",
		"",
		"export const OpenAgentLayerPlugin: Plugin = async () => {",
		"\treturn {",
		handlers,
		"\t};",
		"};",
		"",
	].join("\n");
}

function renderOpenCodeHandler(record: PolicyRecord): string {
	const event = String(
		record.surface_mappings[OPENCODE_SURFACE] ?? "session.status",
	);
	const runtimePath = `${OPENCODE_ARTIFACT_ROOT}/${record.runtime_script ?? `runtime/${record.id}.mjs`}`;
	return [
		`\t\t${JSON.stringify(event)}: async (input: unknown) => {`,
		`\t\t\tconst decision = await runPolicy(${JSON.stringify(runtimePath)}, { event: ${JSON.stringify(event)}, policy_id: ${JSON.stringify(record.id)}, surface: ${JSON.stringify(OPENCODE_SURFACE)}, tool_input: input });`,
		...(event === "tui.prompt.append"
			? [
					'\t\t\tif (typeof decision.context?.prompt_append === "string") return decision.context.prompt_append;',
				]
			: []),
		"\t\t},",
	].join("\n");
}
