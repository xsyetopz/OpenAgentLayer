import type {
	AdapterBundle,
	InstallOptions,
	InstallPlan,
} from "@openagentlayer/adapter-contract";

export function createClaudeInstallPlan(
	bundle: AdapterBundle,
	options: InstallOptions,
): InstallPlan {
	return {
		surface: bundle.surface,
		scope: options.scope,
		entries: bundle.artifacts.map((artifact) => ({
			action: "write",
			path: artifact.path,
			content: artifact.content,
		})),
	};
}
