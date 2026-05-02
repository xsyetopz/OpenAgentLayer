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
		...["npm", "pnpm", "yarn", "npx"].map((name) => ({
			provider: "codex" as const,
			path: `.codex/openagentlayer/shim/${name}`,
			content:
				name === "npx" ? renderNpxShim() : renderPackageManagerShim(name),
			sourceId: "runtime:codex-bun-shim",
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

function renderNpxShim(): string {
	return `#!/usr/bin/env zsh
exec rtk proxy -- bunx "$@"
`;
}

function renderPackageManagerShim(name: string): string {
	const publishCase =
		name === "yarn"
			? `
  npm)
    shift
    if [[ "$1" == "publish" ]]; then
      shift
      exec rtk proxy -- bun publish "$@"
    fi
    echo "OAL has no Bun rewrite for yarn npm $1" >&2
    exit 64
    ;;`
			: "";
	const upgradeCase =
		name === "yarn"
			? `
  upgrade|up)
    shift
    exec rtk proxy -- bun update "$@"
    ;;`
			: "";
	const execCase =
		name === "pnpm" || name === "yarn"
			? `
  dlx|exec)
    shift
    [[ "$1" == "--" ]] && shift
    exec rtk proxy -- bunx "$@"
    ;;`
			: `
  exec|x)
    shift
    [[ "$1" == "--" ]] && shift
    exec rtk proxy -- bunx "$@"
    ;;`;
	const runCase = name === "npm" ? "run|run-script" : "run";
	const removeCase =
		name === "npm" ? "remove|rm|uninstall|un" : "remove|rm|uninstall";
	return `#!/usr/bin/env zsh
set -e
case "$1" in
  ${execCase.trim()}
  ${runCase})
    shift
    exec rtk proxy -- bun run "$@"
    ;;
  install|i|ci)
    shift
    exec rtk proxy -- bun install "$@"
    ;;
  add)
    shift
    exec rtk proxy -- bun add "$@"
    ;;
  ${removeCase})
    shift
    exec rtk proxy -- bun remove "$@"
    ;;
  update|up)
    shift
    exec rtk proxy -- bun update "$@"
    ;;${upgradeCase}
  outdated)
    shift
    exec rtk proxy -- bun outdated "$@"
    ;;
  publish)
    shift
    exec rtk proxy -- bun publish "$@"
    ;;
  pack)
    shift
    exec rtk proxy -- bun pm pack "$@"
    ;;
  link)
    shift
    exec rtk proxy -- bun link "$@"
    ;;
  list|ls)
    shift
    exec rtk proxy -- bun pm ls "$@"
    ;;${publishCase}
  "")
    exec rtk proxy -- bun install
    ;;
  *)
    ${
			name === "yarn"
				? 'exec rtk proxy -- bun run "$@"'
				: `echo "OAL has no Bun rewrite for ${name} $1" >&2
    exit 64`
		}
    ;;
esac
`;
}

function shellQuote(value: string): string {
	return SHELL_SAFE_PATTERN.test(value)
		? value
		: `'${value.replaceAll("'", "'\\''")}'`;
}
