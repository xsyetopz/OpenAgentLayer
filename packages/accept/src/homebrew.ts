import { readFile } from "node:fs/promises";
import { join } from "node:path";

interface PackageJson {
	version: string;
}

const REQUIRED_CASK_SNIPPETS = [
	'cask "openagentlayer" do',
	"sha256 :no_check",
	'url "https://github.com/xsyetopz/OpenAgentLayer/releases/download/v#{version}/openagentlayer-#{version}-macos-universal.tar.gz"',
	'name "OpenAgentLayer"',
	'desc "Generator and deployer for Claude Code, Codex, and OpenCode agent layers"',
	"strategy :github_latest",
	'depends_on formula: "bun"',
	'binary "bin/oal", target: "oal"',
	"`oal check`",
] as const;

const FORBIDDEN_CASK_SNIPPETS = ["TODO", "FIXME", "placeholder"] as const;

export async function assertHomebrewCask(repoRoot: string): Promise<void> {
	const packageJson = JSON.parse(
		await readFile(join(repoRoot, "package.json"), "utf8"),
	) as PackageJson;
	const cask = await readFile(
		join(repoRoot, "homebrew/Casks/openagentlayer.rb"),
		"utf8",
	);
	for (const snippet of REQUIRED_CASK_SNIPPETS)
		if (!cask.includes(snippet))
			throw new Error(`Homebrew cask missing required snippet: \`${snippet}\``);
	if (!cask.includes(`version "${packageJson.version}"`))
		throw new Error("Homebrew cask version does not match package.json");
	for (const snippet of FORBIDDEN_CASK_SNIPPETS)
		if (cask.toLowerCase().includes(snippet.toLowerCase()))
			throw new Error(
				`Homebrew cask contains forbidden snippet: \`${snippet}\``,
			);
}
