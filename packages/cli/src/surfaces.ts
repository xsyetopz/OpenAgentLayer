import type { Surface } from "@openagentlayer/types";
import { SURFACES } from "@openagentlayer/types/constants";
import type { CliOptions, ScopeOption, SurfaceOption } from "./options";
import { printError } from "./output";

export function hasInstallOptions(
	options: CliOptions,
): options is CliOptions & {
	readonly surface: SurfaceOption;
	readonly scope: ScopeOption;
} {
	if (options.surface === undefined) {
		printError("Missing required --surface <codex|claude|opencode|all>.");
		return false;
	}
	if (options.scope === undefined) {
		printError("Missing required --scope <project|global>.");
		return false;
	}
	if (options.scope === "global" && options.target === undefined) {
		printError("Global install requires explicit --target <dir>.");
		return false;
	}
	return true;
}

export function resolveTargetRoot(
	options: CliOptions & { readonly scope: ScopeOption },
): string {
	if (options.target !== undefined) {
		return options.target;
	}
	return options.root;
}

export function resolveSurfaces(surface: SurfaceOption): readonly Surface[] {
	return surface === "all" ? SURFACES : [surface];
}
