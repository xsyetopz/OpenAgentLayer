import { createHash } from "node:crypto";
import type { Artifact, ArtifactSet } from "@openagentlayer/artifact";
import { artifactHash } from "@openagentlayer/artifact";
import { createManifest, manifestPath } from "@openagentlayer/manifest";
import type { OalSource, Provider } from "@openagentlayer/source";

const PROVIDERS: Provider[] = ["codex", "claude", "opencode"];
const AGENT_PATTERNS = {
	codex: /^\.codex\/agents\/.+\.toml$/,
	claude: /^\.claude\/agents\/.+\.md$/,
	opencode: /^\.opencode\/agents\/.+\.md$/,
} satisfies Record<Provider, RegExp>;
const SKILL_PATTERNS = {
	codex: /^\.codex\/openagentlayer\/skills\/[^/]+\/SKILL\.md$/,
	claude: /^\.claude\/skills\/[^/]+\/SKILL\.md$/,
	opencode: /^\.opencode\/skills\/[^/]+\/SKILL\.md$/,
} satisfies Record<Provider, RegExp>;
const COMMAND_PATTERNS = {
	codex: /^AGENTS\.md$/,
	claude: /^\.claude\/commands\/.+\.md$/,
	opencode: /^\.opencode\/commands\/.+\.md$/,
} satisfies Record<Provider, RegExp>;
const HOOK_PATTERNS = {
	codex: /^\.codex\/openagentlayer\/hooks\/.+\.mjs$/,
	claude: /^\.claude\/hooks\/scripts\/.+\.mjs$/,
	opencode: /^\.opencode\/openagentlayer\/hooks\/.+\.mjs$/,
} satisfies Record<Provider, RegExp>;
const TOOL_PATTERNS = {
	codex: /a^/,
	claude: /a^/,
	opencode: /^\.opencode\/tools\/.+\.ts$/,
} satisfies Record<Provider, RegExp>;

export type InspectTopic =
	| "capabilities"
	| "manifest"
	| "generated-diff"
	| "rtk-report"
	| "command-policy"
	| "release-witness";

export interface InspectContext {
	repoRoot: string;
	source: OalSource;
	artifacts: Artifact[];
	unsupported: ArtifactSet["unsupported"];
}

export interface ReleaseWitness {
	version: string;
	git: string;
	sourceHash: string;
	artifactCount: number;
	manifestEntries: number;
	providers: Record<Provider, number>;
	artifactHashes: Record<string, string>;
}

export async function inspectTopic(
	topic: InspectTopic,
	context: InspectContext,
): Promise<string> {
	switch (topic) {
		case "capabilities":
			return capabilityReport(context);
		case "manifest":
			return manifestReport(context);
		case "generated-diff":
			return generatedDiffReport(context);
		case "rtk-report":
			return "Run `oal rtk-report --project <cwd>` for filtered/proxy/fallback totals and top output leaks.";
		case "command-policy":
			return "Use `oal mcp serve oal-inspect` tool `command_policy` or the OpenCode `command_policy_check` tool to evaluate one shell command.";
		case "release-witness":
			return JSON.stringify(await releaseWitness(context), undefined, 2);
		default: {
			const unsupported: never = topic;
			throw new Error(
				`Inspect topic \`${unsupported}\` needs a supported value`,
			);
		}
	}
}

export function capabilityReport(context: InspectContext): string {
	const lines = ["# OAL Capability Report", ""];
	for (const provider of PROVIDERS) {
		const artifacts = context.artifacts.filter(
			(artifact) => artifact.provider === provider,
		);
		lines.push(`## ${provider}`);
		lines.push(`artifacts: ${artifacts.length}`);
		lines.push(
			`agents: ${countPath(artifacts, providerAgentPattern(provider))}`,
		);
		lines.push(
			`skills: ${countPath(artifacts, providerSkillPattern(provider))}`,
		);
		lines.push(
			`commands: ${countPath(artifacts, providerCommandPattern(provider))}`,
		);
		lines.push(`hooks: ${countPath(artifacts, providerHookPattern(provider))}`);
		lines.push(`tools: ${countPath(artifacts, providerToolPattern(provider))}`);
		const gaps = context.unsupported.filter(
			(item) => item.provider === provider,
		);
		lines.push(
			`capability gaps: ${gaps.length === 0 ? "none" : gaps.map((gap) => `${gap.capability}: ${gap.reason}`).join("; ")}`,
		);
		lines.push("");
	}
	return lines.join("\n").trimEnd();
}

export function manifestReport(context: InspectContext): string {
	const manifest = createManifest(context.artifacts);
	const lines = ["# OAL Manifest Report", ""];
	for (const provider of PROVIDERS) {
		const entries = manifest.entries.filter(
			(entry) => entry.provider === provider,
		);
		lines.push(`## ${provider}`);
		lines.push(`manifest: ${manifestPath(provider)}`);
		lines.push(`entries: ${entries.length}`);
		lines.push(
			`modes: ${modeCount(entries.map((entry) => entry.mode)).join(", ")}`,
		);
		lines.push("");
	}
	lines.push(`total entries: ${manifest.entries.length}`);
	return lines.join("\n").trimEnd();
}

export function generatedDiffReport(context: InspectContext): string {
	const bySource = new Map<string, number>();
	for (const artifact of context.artifacts)
		bySource.set(artifact.sourceId, (bySource.get(artifact.sourceId) ?? 0) + 1);
	return [
		"# OAL Generated Diff Inputs",
		`artifacts: ${context.artifacts.length}`,
		`source records: ${bySource.size}`,
		...Array.from(bySource.entries())
			.sort(([left], [right]) => left.localeCompare(right))
			.slice(0, 40)
			.map(([sourceId, count]) => `- ${sourceId}: ${count}`),
	].join("\n");
}

export async function releaseWitness(
	context: InspectContext,
): Promise<ReleaseWitness> {
	return {
		version: context.source.version,
		git: await gitHead(context.repoRoot),
		sourceHash: sha256(JSON.stringify(context.source)),
		artifactCount: context.artifacts.length,
		manifestEntries: createManifest(context.artifacts).entries.length,
		providers: Object.fromEntries(
			PROVIDERS.map((provider) => [
				provider,
				context.artifacts.filter((artifact) => artifact.provider === provider)
					.length,
			]),
		) as Record<Provider, number>,
		artifactHashes: Object.fromEntries(
			context.artifacts.map((artifact) => [
				`${artifact.provider}:${artifact.path}`,
				artifactHash(artifact.content),
			]),
		),
	};
}

function providerAgentPattern(provider: Provider): RegExp {
	return AGENT_PATTERNS[provider];
}

function providerSkillPattern(provider: Provider): RegExp {
	return SKILL_PATTERNS[provider];
}

function providerCommandPattern(provider: Provider): RegExp {
	return COMMAND_PATTERNS[provider];
}

function providerHookPattern(provider: Provider): RegExp {
	return HOOK_PATTERNS[provider];
}

function providerToolPattern(provider: Provider): RegExp {
	return TOOL_PATTERNS[provider];
}

function countPath(artifacts: Artifact[], pattern: RegExp): number {
	return artifacts.filter((artifact) => pattern.test(artifact.path)).length;
}

function modeCount(modes: string[]): string[] {
	const counts = new Map<string, number>();
	for (const mode of modes) counts.set(mode, (counts.get(mode) ?? 0) + 1);
	return Array.from(counts.entries()).map(
		([mode, count]) => `${mode}=${count}`,
	);
}

async function gitHead(repoRoot: string): Promise<string> {
	const proc = Bun.spawn(
		["git", "-C", repoRoot, "rev-parse", "--short", "HEAD"],
		{
			stdout: "pipe",
			stderr: "ignore",
		},
	);
	const [stdout, code] = await Promise.all([
		new Response(proc.stdout).text(),
		proc.exited,
	]);
	return code === 0 ? stdout.trim() : "unknown";
}

function sha256(text: string): string {
	return createHash("sha256").update(text).digest("hex");
}
