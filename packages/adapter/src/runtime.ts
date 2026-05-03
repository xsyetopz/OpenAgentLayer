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
${renderShimPathEscape()}exec rtk ${rtkArgs.map(shellQuote).join(" ")} "$@"
`;
}

function renderShimPathEscape(): string {
	return `shim_dir="\${0:A:h}"
path_entries=("\${(@s/:/)PATH}")
path_entries=("\${(@)path_entries:#\${shim_dir}}")
export PATH="\${(j/:/)path_entries}"
`;
}

function renderNpxShim(): string {
	return `#!/usr/bin/env zsh
${renderShimPathEscape()}exec rtk proxy -- bunx "$@"
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
      ${renderPackageManagerExec("bun publish")}
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
    ${renderPackageManagerExec("bun update")}
    ;;`
			: "";
	const execCase =
		name === "pnpm" || name === "yarn"
			? `
  dlx|exec)
    shift
    [[ "$1" == "--" ]] && shift
    ${renderPackageManagerExec("bunx")}
    ;;`
			: `
  exec|x)
    shift
    [[ "$1" == "--" ]] && shift
    ${renderPackageManagerExec("bunx")}
    ;;`;
	const runCase = name === "npm" ? "run|run-script" : "run";
	const removeCase =
		name === "npm" ? "remove|rm|uninstall|un" : "remove|rm|uninstall";
	return `#!/usr/bin/env zsh
set -e
${renderShimPathEscape()}case "$1" in
  ${execCase.trim()}
  ${runCase})
    shift
    ${renderPackageManagerExec("bun run")}
    ;;
  install|i|ci)
    shift
    ${renderPackageManagerExec("bun install")}
    ;;
  add)
    shift
    ${renderPackageManagerExec("bun add")}
    ;;
  ${removeCase})
    shift
    ${renderPackageManagerExec("bun remove")}
    ;;
  update|up)
    shift
    ${renderPackageManagerExec("bun update")}
    ;;${upgradeCase}
  outdated)
    shift
    ${renderPackageManagerExec("bun outdated")}
    ;;
  publish)
    shift
    ${renderPackageManagerExec("bun publish")}
    ;;
  pack)
    shift
    ${renderPackageManagerExec("bun pm pack")}
    ;;
  link)
    shift
    ${renderPackageManagerExec("bun link")}
    ;;
  list|ls)
    shift
    ${renderPackageManagerExec("bun pm ls")}
    ;;${publishCase}
  "")
    ${renderPackageManagerExec("bun install")}
    ;;
  *)
    ${
			name === "yarn"
				? renderPackageManagerExec("bun run")
				: `echo "OAL has no Bun rewrite for ${name} $1" >&2
    exit 64`
		}
    ;;
esac
`;
}

function renderPackageManagerExec(command: string): string {
	return `exec rtk proxy -- ${command} "$@"`;
}

function shellQuote(value: string): string {
	return SHELL_SAFE_PATTERN.test(value)
		? value
		: `'${value.replaceAll("'", "'\\''")}'`;
}
