import type { SurfaceAdapter } from "@openagentlayer/adapter-contract";
import { validateAdapterBundle } from "@openagentlayer/adapter-contract";
import { renderClaudeBundle, renderClaudeRecord } from "./bundle";
import { CLAUDE_SURFACE } from "./constants";
import { createClaudeInstallPlan } from "./install-plan";

export const claudeAdapterId = CLAUDE_SURFACE;

export function createClaudeAdapter(): SurfaceAdapter {
	return {
		id: CLAUDE_SURFACE,
		surface: CLAUDE_SURFACE,
		capabilities: [
			"agent",
			"skill",
			"command",
			"policy",
			"guidance",
			"config",
			"validation-metadata",
		],
		supports: (record) => record.surfaces.includes(CLAUDE_SURFACE),
		render: renderClaudeRecord,
		renderBundle: renderClaudeBundle,
		validateBundle: validateAdapterBundle,
		installPlan: createClaudeInstallPlan,
	};
}
