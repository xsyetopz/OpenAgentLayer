#!/usr/bin/env bun
import { createInterface } from "node:readline";
import { detectProviders } from "./detect.ts";
import { install } from "./install.ts";
import type {
	InstallOptions,
	InstallScope,
	ProviderAvailability,
} from "./types.ts";

type ProviderTier = "auto" | "copilot" | "free";

interface ParseState {
	scope: InstallScope | undefined;
	provider: ProviderTier | undefined;
	clean: boolean;
	dryRun: boolean;
	noOverrides: boolean;
	plugins: string[];
	defaultModel: string;
	modelOverrides: Record<string, string>;
}

type ArgHandler = (args: string[], i: number, state: ParseState) => number;

function parseScopeArg(args: string[], i: number, state: ParseState): number {
	const next = args[i + 1];
	if (next === "project" || next === "global") {
		state.scope = next;
		return i + 1;
	}
	throw new Error(
		`--scope requires "project" or "global", got: ${String(next)}`,
	);
}

function parseProviderArg(
	args: string[],
	i: number,
	state: ParseState,
): number {
	const next = args[i + 1];
	if (next === "auto" || next === "copilot" || next === "free") {
		state.provider = next;
		return i + 1;
	}
	throw new Error(
		`--provider requires "auto", "copilot", or "free", got: ${String(next)}`,
	);
}

function parsePluginsArg(args: string[], i: number, state: ParseState): number {
	const next = args[i + 1];
	if (!next || next.startsWith("--")) {
		throw new Error(
			"--plugins requires a comma-separated list of plugin names",
		);
	}
	state.plugins = next
		.split(",")
		.map((p) => p.trim())
		.filter((p) => p.length > 0);
	return i + 1;
}

function parseDefaultModelArg(
	args: string[],
	i: number,
	state: ParseState,
): number {
	const next = args[i + 1];
	if (!next || next.startsWith("--")) {
		throw new Error("--default-model requires a model id");
	}
	state.defaultModel = next.trim();
	return i + 1;
}

function parseModelArg(args: string[], i: number, state: ParseState): number {
	const next = args[i + 1];
	if (!next || next.startsWith("--")) {
		throw new Error("--model requires ROLE=MODEL");
	}
	const eqIdx = next.indexOf("=");
	if (eqIdx <= 0 || eqIdx === next.length - 1) {
		throw new Error(`--model requires ROLE=MODEL, got: ${next}`);
	}
	state.modelOverrides[next.slice(0, eqIdx)] = next.slice(eqIdx + 1);
	return i + 1;
}

const FLAG_HANDLERS: Record<string, ArgHandler> = {
	"--scope": parseScopeArg,
	"--provider": parseProviderArg,
	"--plugins": parsePluginsArg,
	"--default-model": parseDefaultModelArg,
	"--model": parseModelArg,
	"--clean": (_a, i, s) => {
		s.clean = true;
		return i;
	},
	"--dry-run": (_a, i, s) => {
		s.dryRun = true;
		return i;
	},
	"--no-overrides": (_a, i, s) => {
		s.noOverrides = true;
		return i;
	},
	"--no-plugins": (_a, i, s) => {
		s.plugins = [];
		return i;
	},
	"--help": () => {
		printHelp();
		process.exit(0);
	},
	"-h": () => {
		printHelp();
		process.exit(0);
	},
};

function parseArgs(argv: string[]): ParseState & {
	scope: InstallScope | undefined;
	provider: ProviderTier | undefined;
} {
	const args = argv.slice(2);
	const state: ParseState = {
		scope: undefined,
		provider: undefined,
		clean: false,
		dryRun: false,
		noOverrides: false,
		plugins: [],
		defaultModel: "",
		modelOverrides: {},
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i] ?? "";
		const handler = FLAG_HANDLERS[arg];
		if (!handler) {
			throw new Error(`Unknown argument: ${arg}`);
		}
		i = handler(args, i, state);
	}

	return state;
}

function tierToProviders(tier: ProviderTier): ProviderAvailability {
	return {
		githubCopilot: tier === "copilot",
	};
}

function providerLabel(providers: ProviderAvailability): string {
	return providers.githubCopilot ? "copilot" : "free";
}

function promptLine(question: string): Promise<string> {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	return new Promise<string>((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
}

async function promptScope(): Promise<InstallScope> {
	const configHome =
		process.platform === "win32"
			? process.env["APPDATA"]
			: process.env["XDG_CONFIG_HOME"];
	const defaultConfig = configHome
		? `${configHome}/opencode`
		: process.platform === "win32"
			? "%APPDATA%/opencode"
			: "~/.config/opencode";

	console.log("  scope:");
	console.log("    [1] project  (.opencode/ in current workspace)");
	console.log(`    [2] global   (${defaultConfig})`);

	const answer = await promptLine("  > ");
	return answer === "2" ? "global" : "project";
}

function printHelp(): void {
	console.log(`openagentsbtw opencode installer

  --scope project|global     installation target
  --provider auto|copilot|free
  --default-model MODEL      one model id for all roles
  --model ROLE=MODEL         per-role model override
  --clean                    remove existing files first
  --dry-run                  preview without writing
  --no-overrides             skip primary agent overrides
  --plugins <names>          comma-separated plugin list
  --no-plugins               disable all plugins
`);
}

async function resolveProviders(
	provider: ProviderTier | undefined,
): Promise<{ providers: ProviderAvailability; detected: boolean }> {
	if (provider && provider !== "auto") {
		return { providers: tierToProviders(provider), detected: false };
	}

	const detected = await detectProviders();
	return { providers: detected, detected: detected.githubCopilot };
}

function row(label: string, value: string, width = 14): string {
	return `  ${label.padEnd(width)} ${value}`;
}

function okRow(label: string, count: number, width = 10): string {
	if (count === 0) {
		return "";
	}
	return `  [ok] ${label.padEnd(width)} ${count}`;
}

async function main(): Promise<void> {
	let parsed: ReturnType<typeof parseArgs>;
	try {
		parsed = parseArgs(process.argv);
	} catch (err) {
		console.error(`  [x] ${(err as Error).message}`);
		console.error("      run with --help for usage");
		process.exit(1);
	}

	console.log();

	const scope = parsed.scope ?? (await promptScope());
	const { providers, detected } = await resolveProviders(parsed.provider);
	const scopeDisplay =
		scope === "global" ? "~/.config/opencode/" : ".opencode/";

	console.log();
	console.log(row("scope", `${scope}  ${scopeDisplay}`));
	console.log(
		row(
			"fallback",
			`${providerLabel(providers)}${detected ? " (detected)" : ""}`,
		),
	);
	if (parsed.defaultModel) {
		console.log(row("default-model", parsed.defaultModel));
	}
	const overrideEntries = Object.entries(parsed.modelOverrides);
	for (const [role, model] of overrideEntries) {
		console.log(row(`model:${role}`, model));
	}
	if (parsed.clean) {
		console.log(row("clean", "yes"));
	}
	if (parsed.dryRun) {
		console.log(row("dry-run", "yes"));
	}
	console.log();

	const options: InstallOptions = {
		scope,
		clean: parsed.clean,
		dryRun: parsed.dryRun,
		noOverrides: parsed.noOverrides,
		plugins: parsed.plugins,
		providers,
		...(process.env["OABTW_COPILOT_PLAN"]
			? { copilotPlan: process.env["OABTW_COPILOT_PLAN"] }
			: {}),
		...(parsed.defaultModel ? { defaultModel: parsed.defaultModel } : {}),
		...(Object.keys(parsed.modelOverrides).length > 0
			? { modelOverrides: parsed.modelOverrides }
			: {}),
	};

	let report: Awaited<ReturnType<typeof install>>;
	try {
		report = await install(options);
	} catch (err) {
		console.error(`  [x] ${(err as Error).message}`);
		process.exit(1);
	}

	const { counts } = report;

	if (parsed.dryRun) {
		console.log("  [--] dry-run complete, no files written");
		process.exit(0);
	}

	console.log(okRow("agents", counts.agents));
	console.log(okRow("commands", counts.commands));
	console.log(okRow("skills", counts.skills));
	console.log(okRow("plugins", counts.plugins));
	console.log(okRow("context", counts.context));
	console.log(okRow("hooks", counts.hooks));
	console.log(okRow("instructions", counts.instructions));
	console.log();
}

void main();
