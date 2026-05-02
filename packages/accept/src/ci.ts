import { readFile } from "node:fs/promises";
import { join } from "node:path";

const CI_WORKFLOW = ".github/workflows/ci.yml";
const REQUIRED_WORKFLOW_TERMS = [
	"pull_request:",
	"branches: [master]",
	'FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"',
	"actions/checkout@v6",
	"submodules: recursive",
	"persist-credentials: false",
	"permissions:\n  contents: read",
	"test -f third_party/caveman/skills/caveman/SKILL.md",
	"test -f third_party/taste-skill/skills/taste-skill/SKILL.md",
	"needs: [quality, dry-run]",
	"github.event_name == 'push'",
	"github.ref == 'refs/heads/master'",
	"github.repository == 'xsyetopz/OpenAgentLayer'",
	'test "$GITHUB_REPOSITORY" = "xsyetopz/OpenAgentLayer"',
	'test "$GITHUB_REF" = "refs/heads/master"',
	'bun run deploy -- --target "$target" --scope project --provider all --dry-run',
	"bun run preview -- --provider all",
	"bun run accept",
	"ruby -c homebrew/Casks/openagentlayer.rb",
	"HOMEBREW_TAP_TOKEN",
] as const;

export async function assertCiCdWorkflow(repoRoot: string): Promise<void> {
	const workflow = await readFile(join(repoRoot, CI_WORKFLOW), "utf8");
	for (const term of REQUIRED_WORKFLOW_TERMS)
		if (!workflow.includes(term))
			throw new Error(`CI/CD workflow missing required guard: ${term}`);
	for (const forbidden of [
		"pull_request_target:",
		"contents: write",
		"actions/checkout@v4",
		"ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION",
	])
		if (workflow.includes(forbidden))
			throw new Error(
				`CI/CD workflow contains forbidden setting: ${forbidden}`,
			);
}
