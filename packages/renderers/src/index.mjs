import { loadAdapters } from "../../core/src/adapters.mjs";
import { loadModelPolicy } from "../../core/src/model-policy.mjs";

const markerStart = "<!-- BEGIN MANAGED BY OpenAgentLayer -->";
const markerEnd = "<!-- END MANAGED BY OpenAgentLayer -->";

function wrapManaged(contents) {
	return `${markerStart}\n${contents.trim()}\n${markerEnd}\n`;
}

function codexArtifact(policy) {
	return {
		contents: wrapManaged(
			`# OpenAgentLayer Codex Policy\n\nUtility model: ${policy.codex.routes.utility}\nImplementation model: ${policy.codex.routes.implementation}\n`,
		),
		path: "codex/AGENTS.md",
		platformId: "codex-cli",
	};
}

function opencodeArtifact(policy) {
	return {
		contents: wrapManaged(
			`# OpenAgentLayer OpenCode Policy\n\nFallback models:\n${policy.opencode.zenFallbackModels.map((model) => `- ${model}`).join("\n")}\n`,
		),
		path: ".opencode/AGENTS.md",
		platformId: "opencode",
	};
}

function genericArtifact(adapter) {
	return {
		contents: wrapManaged(
			`# OpenAgentLayer ${adapter.displayName}\n\nSupport level: ${adapter.level}\n`,
		),
		path: `${adapter.id}/AGENTS.md`,
		platformId: adapter.id,
	};
}

export async function renderArtifacts(platformId = "all") {
	const adapters = await loadAdapters();
	const policy = await loadModelPolicy();
	const selected =
		platformId === "all"
			? adapters
			: adapters.filter((adapter) => adapter.id === platformId);
	if (selected.length === 0) {
		throw new Error(`unknown platform: ${platformId}`);
	}
	return selected.map((adapter) => {
		if (adapter.id === "codex-cli") {
			return codexArtifact(policy);
		}
		if (adapter.id === "opencode") {
			return opencodeArtifact(policy);
		}
		return genericArtifact(adapter);
	});
}

export function renderSummary(artifacts) {
	return artifacts
		.map((artifact) => `${artifact.platformId}\t${artifact.path}`)
		.join("\n");
}
