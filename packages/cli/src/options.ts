import type { Surface } from "@openagentlayer/types";
import { SURFACES } from "@openagentlayer/types/constants";

export type SurfaceOption = Surface | "all";
export type ScopeOption = "project" | "global";

export interface CliOptions {
	readonly root: string;
	readonly out: string | undefined;
	readonly dryRun: boolean;
	readonly surface: SurfaceOption | undefined;
	readonly scope: ScopeOption | undefined;
	readonly target: string | undefined;
}

export function parseOptions(args: readonly string[]): CliOptions {
	let root = process.cwd();
	let out: string | undefined;
	let dryRun = false;
	let surface: SurfaceOption | undefined;
	let scope: ScopeOption | undefined;
	let target: string | undefined;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		switch (arg) {
			case "--root":
				root = readOptionValue(args, index, "--root");
				index += 1;
				break;
			case "--out":
				out = readOptionValue(args, index, "--out");
				index += 1;
				break;
			case "--dry-run":
				dryRun = true;
				break;
			case "--surface":
				surface = readSurfaceOption(args, index);
				index += 1;
				break;
			case "--scope":
				scope = readScopeOption(args, index);
				index += 1;
				break;
			case "--target":
				target = readOptionValue(args, index, "--target");
				index += 1;
				break;
			default:
				throw new Error(`Unknown option '${arg}'.`);
		}
	}

	return { root, out, dryRun, surface, scope, target };
}

function readOptionValue(
	args: readonly string[],
	index: number,
	option: string,
): string {
	const value = args[index + 1];
	if (value === undefined || value.startsWith("--")) {
		throw new Error(`Missing value for ${option}.`);
	}
	return value;
}

function readSurfaceOption(
	args: readonly string[],
	index: number,
): SurfaceOption {
	const value = readOptionValue(args, index, "--surface");
	if (value === "all" || SURFACES.includes(value as Surface)) {
		return value as SurfaceOption;
	}
	throw new Error(`Invalid --surface '${value}'.`);
}

function readScopeOption(args: readonly string[], index: number): ScopeOption {
	const value = readOptionValue(args, index, "--scope");
	if (value === "project" || value === "global") {
		return value;
	}
	throw new Error(`Invalid --scope '${value}'.`);
}
