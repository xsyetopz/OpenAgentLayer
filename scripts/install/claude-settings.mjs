const DEEPWIKI_URL = "https://mcp.deepwiki.com/mcp";

function cloneObject(value) {
	return value && typeof value === "object" && !Array.isArray(value)
		? { ...value }
		: {};
}

export function renderClaudeSettingsTemplate(
	templateText,
	{ homeDir, models },
) {
	const escapedHomeDir = JSON.stringify(homeDir).slice(1, -1);
	return JSON.parse(
		templateText
			.replaceAll("__HOME__", escapedHomeDir)
			.replaceAll("__OPUS_MODEL__", models.opusModel)
			.replaceAll("__SONNET_MODEL__", models.sonnetModel)
			.replaceAll("__HAIKU_MODEL__", models.haikuModel),
	);
}

export function mergeClaudeSettings({
	template,
	existing,
	model,
	deepwiki = false,
}) {
	const templatePayload = cloneObject(template);
	const existingPayload = cloneObject(existing);

	const merged = {
		...templatePayload,
		...Object.fromEntries(
			Object.entries(existingPayload).filter(
				([key]) => !(key in templatePayload),
			),
		),
		env: {
			...cloneObject(templatePayload.env),
			...cloneObject(existingPayload.env),
		},
		enabledPlugins: {
			...cloneObject(templatePayload.enabledPlugins),
			...cloneObject(existingPayload.enabledPlugins),
		},
		extraKnownMarketplaces: {
			...cloneObject(templatePayload.extraKnownMarketplaces),
			...cloneObject(existingPayload.extraKnownMarketplaces),
		},
		mcpServers: {
			...cloneObject(templatePayload.mcpServers),
			...cloneObject(existingPayload.mcpServers),
		},
	};

	const isLegacy = (entry, command, args) =>
		entry &&
		typeof entry === "object" &&
		entry.command === command &&
		JSON.stringify(entry.args ?? []) === JSON.stringify(args);

	if (
		isLegacy(merged.mcpServers?.["chrome-devtools"], "bunx", [
			"-y",
			"chrome-devtools-mcp@latest",
		])
	) {
		delete merged.mcpServers["chrome-devtools"];
	}
	if (
		isLegacy(merged.mcpServers?.browsermcp, "bunx", [
			"-y",
			"@browsermcp/mcp@latest",
		])
	) {
		delete merged.mcpServers.browsermcp;
	}

	if (deepwiki) {
		merged.mcpServers.deepwiki = {
			type: "http",
			url: DEEPWIKI_URL,
			enabled: true,
		};
	}
	if (Object.keys(merged.mcpServers).length === 0) {
		delete merged.mcpServers;
	}

	merged.model = model;
	return merged;
}
