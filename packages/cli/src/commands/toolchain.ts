import {
	isExpectedContext7ApiKey,
	type OperatingSystem,
	type OptionalTool,
	optionalFeatureCommands,
	optionalToolLabel,
	type PackageManager,
	planToolchainInstall,
	renderToolchainPlan,
} from "@openagentlayer/toolchain";
import { option } from "../arguments";

export function runToolchainCommand(args: string[]): void {
	const os = osOption(option(args, "--os"));
	const packageManager = option(args, "--pkg") as PackageManager | undefined;
	const includeOptional = optionalTools(option(args, "--optional"));
	const context7ApiKey = option(args, "--context7-api-key");
	if (context7ApiKey && !isExpectedContext7ApiKey(context7ApiKey))
		throw new Error("Context7 API key must start with ctx7sk-");
	const baseOptions = {
		os,
		hasHomebrew: !args.includes("--homebrew-missing"),
		includeOptional,
		...(context7ApiKey ? { context7ApiKey } : {}),
	};
	const plan = planToolchainInstall(
		packageManager ? { ...baseOptions, packageManager } : baseOptions,
	);
	if (args.includes("--json")) console.log(JSON.stringify(plan, undefined, 2));
	else console.log(renderToolchainPlan(plan));
}

export function runFeaturesCommand(args: string[]): void {
	const install = optionalTools(option(args, "--install"));
	const remove = optionalTools(option(args, "--remove"));
	const context7ApiKey = option(args, "--context7-api-key");
	if (context7ApiKey && !isExpectedContext7ApiKey(context7ApiKey))
		throw new Error("Context7 API key must start with ctx7sk-");
	if (install.length === 0 && remove.length === 0)
		throw new Error(
			"Expected `--install` or `--remove` with `ctx7,deepwiki,playwright,anthropic-docs,opencode-docs`",
		);
	const commands = [
		...optionalFeatureCommands("install", install, {
			...(context7ApiKey ? { context7ApiKey } : {}),
		}),
		...optionalFeatureCommands("remove", remove),
	];
	console.log(
		[
			"# OpenAgentLayer Optional Feature Commands",
			`Features: ${[...install, ...remove].map(optionalToolLabel).join(", ")}`,
			"",
			"```bash",
			...commands,
			"```",
			"",
		].join("\n"),
	);
}

function osOption(rawOs: string | undefined): OperatingSystem {
	if (rawOs === "macos" || rawOs === "linux") return rawOs;
	if (!rawOs) return process.platform === "darwin" ? "macos" : "linux";
	throw new Error(
		`Unsupported OS \`${rawOs}\`. Expected \`macos\` or \`linux\`.`,
	);
}

function optionalTools(rawTools: string | undefined): OptionalTool[] {
	if (!rawTools) return [];
	return rawTools
		.split(",")
		.map((tool) => tool.trim())
		.filter((tool): tool is OptionalTool =>
			[
				"ctx7",
				"deepwiki",
				"playwright",
				"anthropic-docs",
				"opencode-docs",
			].includes(tool),
		);
}
