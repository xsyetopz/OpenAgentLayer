import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Artifact, ArtifactSet } from "@openagentlayer/artifact";
import type { Provider } from "@openagentlayer/source";

const RTK_SHIMS: Record<string, string[]> = {
	aws: ["aws"],
	bun: ["proxy", "--", "bun"],
	bunx: ["proxy", "--", "bunx"],
	cargo: ["cargo"],
	cat: ["read"],
	curl: ["curl"],
	docker: ["docker"],
	dotnet: ["dotnet"],
	find: ["find"],
	gh: ["gh"],
	git: ["git"],
	glab: ["glab"],
	go: ["go"],
	grep: ["grep"],
	kubectl: ["kubectl"],
	npm: ["npm"],
	npx: ["npx"],
	pytest: ["pytest"],
	rg: ["grep"],
	ruff: ["ruff"],
	tsc: ["tsc"],
	vitest: ["vitest"],
	wget: ["wget"],
};
const SHELL_SAFE_PATTERN = /^[A-Za-z0-9_./:-]+$/;

export function renderCodexShellShimArtifacts(): ArtifactSet {
	const artifacts: Artifact[] = [
		{
			provider: "codex",
			path: ".codex/openagentlayer/shim/oal-zsh",
			content: renderZshForkEntrypoint(),
			sourceId: "runtime:codex-rtk-shim",
			executable: true,
			mode: "file",
		},
		...Object.entries(RTK_SHIMS).map(([name, rtkArgs]) => ({
			provider: "codex" as const,
			path: `.codex/openagentlayer/shim/${name}`,
			content: renderRtkShim(rtkArgs),
			sourceId: "runtime:codex-rtk-shim",
			executable: true,
			mode: "file" as const,
		})),
	];
	return { artifacts, unsupported: [] };
}

export async function renderPrivilegedExecArtifacts(
	provider: Provider,
	repoRoot: string,
	prefix: string,
): Promise<Artifact[]> {
	return await Promise.all(
		["privileged-exec.mjs", "privileged-exec-client.mjs"].map(
			async (script) => ({
				provider,
				path: `${prefix}/${script}`,
				content: await readFile(
					join(repoRoot, "packages/runtime/privileged", script),
					"utf8",
				),
				sourceId: `runtime:${script}`,
				executable: true,
				mode: "file" as const,
			}),
		),
	);
}

function renderZshForkEntrypoint(): string {
	return `#!/usr/bin/env zsh
set -e
shim_dir="\${0:A:h}"
export PATH="\${shim_dir}:\${PATH}"
exec /bin/zsh "$@"
`;
}

function renderRtkShim(rtkArgs: string[]): string {
	return `#!/usr/bin/env zsh
exec rtk ${rtkArgs.map(shellQuote).join(" ")} "$@"
`;
}

function shellQuote(value: string): string {
	return SHELL_SAFE_PATTERN.test(value)
		? value
		: `'${value.replaceAll("'", "'\\''")}'`;
}
