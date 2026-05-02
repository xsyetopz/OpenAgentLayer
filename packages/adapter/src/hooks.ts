import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Artifact } from "@openagentlayer/artifact";
import type { HookRecord, Provider } from "@openagentlayer/source";

const RUNTIME_HOOK_DIR = "packages/runtime/hooks";

export async function renderHookArtifacts(
	provider: Provider,
	hooks: HookRecord[],
	prefix: string,
	repoRoot: string,
): Promise<Artifact[]> {
	const providerHooks = hooks.filter((hook) =>
		hook.providers.includes(provider),
	);
	const runtimeSupport = await renderHookArtifact(
		provider,
		{
			id: "runtime_support",
			script: "_runtime.mjs",
			providers: [provider],
			events: {},
		},
		`${prefix}/_runtime.mjs`,
		repoRoot,
	);
	const bunRewriteSupport = await renderHookArtifact(
		provider,
		{
			id: "bun_rewrite_support",
			script: "_bun-rewrite.mjs",
			providers: [provider],
			events: {},
		},
		`${prefix}/_bun-rewrite.mjs`,
		repoRoot,
	);
	const hookArtifacts = await Promise.all(
		providerHooks.map((hook) =>
			renderHookArtifact(provider, hook, `${prefix}/${hook.script}`, repoRoot),
		),
	);
	return [runtimeSupport, bunRewriteSupport, ...hookArtifacts];
}

async function renderHookArtifact(
	provider: Provider,
	hook: HookRecord,
	path: string,
	repoRoot: string,
): Promise<Artifact> {
	const content = await readFile(
		join(repoRoot, RUNTIME_HOOK_DIR, hook.script),
		"utf8",
	);
	return {
		provider,
		path,
		content,
		sourceId: `hook:${hook.id}`,
		executable: true,
		mode: "file",
	};
}
