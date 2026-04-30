import type { SurfaceAdapter } from "@openagentlayer/adapter-contract";
import { validateAdapterBundle } from "@openagentlayer/adapter-contract";
import { renderCodexBundle, renderCodexRecord } from "./bundle";
import { CODEX_SURFACE } from "./constants";
import { createCodexInstallPlan } from "./install-plan";

export const codexAdapterId = CODEX_SURFACE;

export function createCodexAdapter(): SurfaceAdapter {
	return {
		id: CODEX_SURFACE,
		surface: CODEX_SURFACE,
		capabilities: [
			"agent",
			"skill",
			"command",
			"policy",
			"guidance",
			"config",
			"plugin",
			"validation-metadata",
		],
		supports: (record) => record.surfaces.includes(CODEX_SURFACE),
		render: renderCodexRecord,
		renderBundle: renderCodexBundle,
		validateBundle: validateAdapterBundle,
		installPlan: createCodexInstallPlan,
	};
}
