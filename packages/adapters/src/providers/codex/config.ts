import type {
	AgentRecord,
	PolicyRecord,
	SourceGraph,
} from "@openagentlayer/types";
import {
	renderTomlDocument,
	resolveHookEvent,
	tomlMultilineString,
} from "../../shared";
import {
	renderProjectPromptInstructions,
	renderPromptLayerBlock,
} from "../../shared/prompt-layers";
import { CODEX_ARTIFACT_ROOT, CODEX_SURFACE } from "./constants";

export function renderCodexConfig(graph: SourceGraph): string {
	const config = renderCodexConfigObject(graph);
	const baseConfig = renderTomlDocument(config);
	const hooks = graph.policies
		.filter((record) => record.surfaces.includes(CODEX_SURFACE))
		.map(renderCodexHook)
		.join("\n");
	return hooks === "" ? baseConfig : `${baseConfig}\n${hooks}`;
}

export function renderCodexAgentConfig(
	record: AgentRecord,
	graph: SourceGraph | undefined,
	assignment: {
		readonly model: string | undefined;
		readonly effort: string | undefined;
	},
): string {
	return renderTomlDocument({
		description: record.description,
		developer_instructions: tomlMultilineString(
			[
				record.prompt_content.trimEnd(),
				"",
				`OAL role: ${record.role}.`,
				record.route_contract === undefined
					? undefined
					: `Route contract: ${record.route_contract}.`,
				...(graph === undefined
					? []
					: [
							"",
							renderPromptLayerBlock(graph, CODEX_SURFACE, {
								agent: record,
								routeContract: record.route_contract,
							}),
						]),
			]
				.filter((line): line is string => line !== undefined)
				.join("\n"),
		),
		model: assignment.model,
		model_reasoning_effort: assignment.effort,
		name: record.id,
		nickname_candidates: [record.id],
		sandbox_mode: record.permissions.includes("write")
			? "workspace-write"
			: "read-only",
	});
}

export function renderCodexAgentsMd(graph: SourceGraph): string {
	const guidance = graph.guidance
		.filter((record) => record.surfaces.includes(CODEX_SURFACE))
		.map((record) => `## ${record.title}\n\n${record.body_content.trim()}`)
		.join("\n\n");
	const agentList = graph.agents
		.filter((record) => record.surfaces.includes(CODEX_SURFACE))
		.map((record) => `- ${record.id}: ${record.description}`)
		.join("\n");
	return [
		"# OpenAgentLayer Codex Instructions",
		"",
		"OpenAgentLayer provides project behavior, routing, validation, and hook policy for Codex.",
		"Use `.codex/agents/*.toml` custom agents for Greek-god role delegation.",
		"Use `.codex/openagentlayer/plugin/skills/` for OAL command and skill surfaces.",
		"",
		renderProjectPromptInstructions(graph, CODEX_SURFACE),
		"",
		"## Available OAL Agents",
		"",
		agentList,
		guidance === "" ? "" : "",
		guidance,
		"",
	].join("\n");
}

function renderCodexConfigObject(graph: SourceGraph) {
	const profiles = Object.fromEntries(
		graph.modelPlans
			.filter((record) => record.surfaces.includes(CODEX_SURFACE))
			.map((record) => [
				record.id,
				{
					approval_policy: "on-request",
					approvals_reviewer: "auto_review",
					model: record.default_model,
					model_reasoning_effort: record.implementation_effort,
					plan_mode_reasoning_effort: record.plan_effort,
				},
			]),
	);
	const projectDefaults =
		graph.surfaceConfigs.find((record) => record.surface === CODEX_SURFACE)
			?.project_defaults ?? {};
	return {
		...projectDefaults,
		agents: {
			max_depth: 1,
			max_threads: 6,
		},
		profiles,
	};
}

function renderCodexHook(record: PolicyRecord): string {
	const event = resolveHookEvent(record, CODEX_SURFACE);
	const matcher =
		record.matcher === undefined || event === "Stop"
			? []
			: [`matcher = ${JSON.stringify(record.matcher)}`];
	const runtimePath = `${CODEX_ARTIFACT_ROOT}/${record.runtime_script ?? `runtime/${record.id}.mjs`}`;
	return [
		`[[hooks.${event}]]`,
		...matcher,
		`[[hooks.${event}.hooks]]`,
		'type = "command"',
		`command = ${JSON.stringify(`bun ${runtimePath}`)}`,
		"timeout = 10",
		"async = false",
		`statusMessage = ${JSON.stringify(`checking ${record.id}...`)}`,
		"",
	].join("\n");
}
