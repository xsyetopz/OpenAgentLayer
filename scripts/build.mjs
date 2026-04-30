import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

function parseArgs(argv) {
	const outIdx = argv.indexOf("--out");
	const outShortIdx = argv.indexOf("-o");
	const out =
		(outIdx !== -1 && argv[outIdx + 1]) ||
		(outShortIdx !== -1 && argv[outShortIdx + 1]) ||
		"";
	if (!out) {
		throw new Error("Missing required --out <dir>");
	}

	const platformIdx = argv.indexOf("--platform");
	const platform = (platformIdx !== -1 && argv[platformIdx + 1]) || "all";

	return { out: path.resolve(out), platform };
}

function run(command, args, { cwd } = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { stdio: "inherit", cwd });
		child.on("exit", (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(new Error(`${command} ${args.join(" ")} failed with ${code}`));
		});
	});
}

async function ensureCleanDir(dir) {
	await fs.rm(dir, { recursive: true, force: true });
	await fs.mkdir(dir, { recursive: true });
}

function prefixFilter(excludedPrefixes) {
	const normalized = excludedPrefixes.map(
		(p) => `${p.replaceAll("\\", "/").replace(/\/+$/, "")}/`,
	);
	return (src) => {
		const rel = path.relative(REPO_ROOT, src).replaceAll("\\", "/");
		if (!rel || rel.startsWith("..")) {
			return true;
		}
		return !normalized.some(
			(prefix) => rel === prefix.slice(0, -1) || rel.startsWith(prefix),
		);
	};
}

async function copyTree(relativeSource, relativeDest, excludedPrefixes) {
	const src = path.join(REPO_ROOT, relativeSource);
	const dest = path.join(relativeDest);
	await fs.cp(src, dest, {
		recursive: true,
		filter: prefixFilter(excludedPrefixes),
	});
}

async function copyStaticAssets(outDir, platform) {
	const out = (p) => path.join(outDir, p);

	// Always ship stream-guard; wrappers are generated.
	await fs.mkdir(out("bin"), { recursive: true });
	await fs.cp(
		path.join(REPO_ROOT, "bin", "stream-guard"),
		out("bin/stream-guard"),
	);

	if (platform === "all" || platform === "claude") {
		await copyTree("claude", out("claude"), [
			"claude/agents",
			"claude/skills",
			"claude/hooks/HOOKS.md",
			"claude/hooks/policy-map.json",
			"claude/templates/CLAUDE.md",
		]);
	}

	if (platform === "all" || platform === "codex") {
		await copyTree("codex", out("codex"), [
			"codex/agents",
			"codex/templates/AGENTS.md",
			"codex/hooks/HOOKS.md",
			"codex/hooks/policy-map.json",
			"codex/plugin/openagentsbtw/skills",
		]);
	}

	if (platform === "all" || platform === "copilot") {
		await copyTree("copilot/hooks/scripts", out("copilot/hooks/scripts"), []);
	}
}

async function main() {
	const { out, platform } = parseArgs(process.argv.slice(2));
	await ensureCleanDir(out);
	await copyStaticAssets(out, platform);
	await run("node", ["scripts/generate.mjs", "--out", out], { cwd: REPO_ROOT });
}

main().catch((error) => {
	console.error(error.message);
	process.exitCode = 1;
});
