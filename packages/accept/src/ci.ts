import { readFile } from "node:fs/promises";
import { join } from "node:path";

const CI_WORKFLOW = ".github/workflows/ci.yml";
const REQUIRED_WORKFLOW_TERMS = [
	"pull_request:",
	"branches: [master]",
	'FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"',
	"actions/checkout@v6",
	"submodules: false",
	"persist-credentials: false",
	"git submodule sync --recursive",
	"git submodule update --init --recursive --jobs 1",
	"git submodule status --recursive",
	"permissions:\n  contents: read",
	"https://raw.githubusercontent.com/rtk-ai/rtk/master/install.sh",
	'echo "$HOME/.rtk/bin" >> "$GITHUB_PATH"',
	"rtk proxy -- bunx tsc --noEmit",
	"rtk proxy -- bun run gitleaks:check",
	"rtk proxy -- bun run test",
	"rtk proxy -- bun run oal:accept",
	"OAL_RTK_GAIN_FIXTURE",
	'--from-file "$RUNNER_TEMP/oal-rtk-gain.txt" --allow-empty-history',
	"test -f third_party/caveman/skills/caveman/SKILL.md",
	"test -f third_party/taste-skill/skills/taste-skill/SKILL.md",
	"test -f third_party/impeccable/skill/SKILL.md",
	"test -f third_party/gitleaks/config/gitleaks.toml",
	"needs: [quality, dry-run]",
	"github.event_name == 'push'",
	"github.ref == 'refs/heads/master'",
	"github.repository == 'xsyetopz/OpenAgentLayer'",
	'test "$GITHUB_REPOSITORY" = "xsyetopz/OpenAgentLayer"',
	'test "$GITHUB_REF" = "refs/heads/master"',
	'bun run oal:deploy -- --target "$target" --scope project --provider all --dry-run',
	"bun run oal:preview -- --provider all",
	"bun run oal:accept",
	"ruby -c homebrew/Casks/openagentlayer.rb",
	"HOMEBREW_TAP_TOKEN",
] as const;

export async function assertCiCdWorkflow(repoRoot: string): Promise<void> {
	const workflow = await readFile(join(repoRoot, CI_WORKFLOW), "utf8");
	for (const term of REQUIRED_WORKFLOW_TERMS)
		if (!workflow.includes(term))
			throw new Error(`CI/CD workflow missing required guard: \`${term}\``);
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
