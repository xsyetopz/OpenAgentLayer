import type { SurfaceAdapter } from "@openagentlayer/adapter-contract";
import { validateAdapterBundle } from "@openagentlayer/adapter-contract";
import { renderOpenCodeBundle, renderOpenCodeRecord } from "./bundle";
import { OPENCODE_SURFACE } from "./constants";
import { createOpenCodeInstallPlan } from "./install-plan";

export const opencodeAdapterId = OPENCODE_SURFACE;

export function createOpenCodeAdapter(): SurfaceAdapter {
	return {
		id: OPENCODE_SURFACE,
		surface: OPENCODE_SURFACE,
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
		supports: (record) => record.surfaces.includes(OPENCODE_SURFACE),
		render: renderOpenCodeRecord,
		renderBundle: renderOpenCodeBundle,
		validateBundle: validateAdapterBundle,
		installPlan: createOpenCodeInstallPlan,
	};
}
