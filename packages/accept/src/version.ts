import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const VERSION_FILES = [
	"package.json",
	"source/product.json",
	"plugins/claude/openagentlayer/.claude-plugin/plugin.json",
	"plugins/codex/openagentlayer/.codex-plugin/plugin.json",
	"plugins/opencode/openagentlayer/package.json",
] as const;

export async function assertVersionBumpTool(repoRoot: string): Promise<void> {
	const script = join(repoRoot, "bump-version.sh");
	const metadata = await stat(script);
	if ((metadata.mode & 0o111) === 0)
		throw new Error("bump-version.sh is not executable");
	const current = await productVersion(repoRoot);
	await assertVersionFilesAgree(repoRoot, current);
	await assertDryRun(repoRoot, "patch", current);
	await assertDryRun(repoRoot, nextPrerelease(current), current);
	await assertRejects(repoRoot, "0.0.1");
}

function nextPrerelease(current: string): string {
	const [core] = current.split("-");
	const [major, minor, patch] = core?.split(".").map(Number) ?? [];
	if (
		major === undefined ||
		minor === undefined ||
		patch === undefined ||
		Number.isNaN(major) ||
		Number.isNaN(minor) ||
		Number.isNaN(patch)
	)
		throw new Error(`Cannot derive pre-release target from \`${current}\``);
	return `${major}.${minor}.${patch + 1}-beta.1`;
}

async function productVersion(repoRoot: string): Promise<string> {
	const packageJson = JSON.parse(
		await readFile(join(repoRoot, "package.json"), "utf8"),
	) as { version?: string };
	if (!packageJson.version) throw new Error("package.json missing version");
	return packageJson.version;
}

async function assertVersionFilesAgree(
	repoRoot: string,
	current: string,
): Promise<void> {
	for (const path of VERSION_FILES) {
		const parsed = JSON.parse(await readFile(join(repoRoot, path), "utf8")) as {
			version?: string;
		};
		if (parsed.version !== current)
			throw new Error(
				`\`${path}\` version \`${parsed.version}\` does not match root`,
			);
	}
	const cask = await readFile(
		join(repoRoot, "homebrew/Casks/openagentlayer.rb"),
		"utf8",
	);
	if (!cask.includes(`version "${current}"`))
		throw new Error("Homebrew cask version does not match root");
	const marketplace = JSON.parse(
		await readFile(join(repoRoot, ".claude-plugin/marketplace.json"), "utf8"),
	) as { plugins?: { version?: string }[] };
	if (marketplace.plugins?.[0]?.version !== current)
		throw new Error("Claude marketplace version does not match root");
	const changelog = await readFile(join(repoRoot, "CHANGELOG.md"), "utf8");
	if (!changelog.includes(`## [${current}]`))
		throw new Error("`CHANGELOG.md` does not contain current version heading");
}

async function assertDryRun(
	repoRoot: string,
	target: string,
	current: string,
): Promise<void> {
	const { stdout } = await execFileAsync(
		"./bump-version.sh",
		["--dry-run", target],
		{ cwd: repoRoot },
	);
	if (!stdout.includes(`DRY RUN OAL version ${current} ->`))
		throw new Error("`bump-version.sh` dry-run did not report version plan");
}

async function assertRejects(repoRoot: string, target: string): Promise<void> {
	try {
		await execFileAsync("./bump-version.sh", ["--dry-run", target], {
			cwd: repoRoot,
		});
	} catch {
		return;
	}
	throw new Error("`bump-version.sh` accepted a downgrade");
}
