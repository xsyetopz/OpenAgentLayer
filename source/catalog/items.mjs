import {
	loadAgents,
	loadCommands,
	loadHookPolicies,
	loadProjectGuidance,
	loadSkills,
} from "./loaders.mjs";

export async function loadCatalog() {
	const [agents, skills, commands, hookPolicies, projectGuidance] =
		await Promise.all([
			loadAgents(),
			loadSkills(),
			loadCommands(),
			loadHookPolicies(),
			loadProjectGuidance(),
		]);

	return {
		agents,
		skills,
		commands,
		hookPolicies,
		projectGuidance,
	};
}

function withKind(items, kind, idKey = "name") {
	return items.map((item) => ({
		kind,
		id: String(item[idKey]),
		item,
	}));
}

export async function loadCatalogItems() {
	const catalog = await loadCatalog();
	return [
		...withKind(catalog.agents, "agent"),
		...withKind(catalog.skills, "skill"),
		...withKind(catalog.hookPolicies, "hook_policy", "id"),
		...withKind(catalog.commands.opencodeCommands, "opencode_command", "name"),
		...withKind(catalog.commands.copilotPrompts, "copilot_prompt", "name"),
		...withKind(catalog.commands.codexModes, "codex_mode", "name"),
		...Object.entries(catalog.projectGuidance).map(([id, item]) => ({
			kind: "guidance",
			id,
			item,
		})),
	];
}
