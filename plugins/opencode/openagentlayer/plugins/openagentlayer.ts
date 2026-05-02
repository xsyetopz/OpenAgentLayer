export const OpenAgentLayerPlugin = {
	name: "openagentlayer",
	event: (event) => {
		if (
			event?.type === "tool.execute.before" &&
			String(event?.tool ?? "").includes("bash")
		) {
			return {
				note: "OAL guard hooks are installed under .opencode/openagentlayer/hooks",
			};
		}
		return {};
	},
};
export const hookScripts = [
	"block-caveman-filler.mjs",
	"block-demo-artifacts.mjs",
	"block-destructive-commands.mjs",
	"block-env-file-access.mjs",
	"block-explanation-only.mjs",
	"block-generated-drift.mjs",
	"block-generated-edits.mjs",
	"block-non-rtk-commands.mjs",
	"block-protected-branch.mjs",
	"block-repeated-failures.mjs",
	"block-secret-files.mjs",
	"block-secret-output.mjs",
	"block-sentinel-markers.mjs",
	"block-test-failure-loop.mjs",
	"block-unsafe-git.mjs",
	"block-weak-blocked.mjs",
	"enforce-route-contract.mjs",
	"inject-changed-files.mjs",
	"inject-git-context.mjs",
	"inject-package-scripts.mjs",
	"inject-project-memory.mjs",
	"inject-route-context.mjs",
	"inject-subagent-context.mjs",
	"prefer-ripgrep.mjs",
	"require-completion-evidence.mjs",
	"require-execution-evidence.mjs",
	"require-jq-yq-edits.mjs",
	"require-validation-evidence.mjs",
	"warn-large-diff.mjs",
];
