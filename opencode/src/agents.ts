import type { AgentRole } from "./models.ts";
import type { AgentMode, AgentPermission, RouteKind } from "./types.ts";

export interface AgentMeta {
	greekName: string;
	description: string;
	color: string;
	mode: AgentMode;
	routeKind: RouteKind;
	permission: AgentPermission;
}

const TEST_RUNNER_BASH: AgentPermission["bash"] = {
	"npm test*": "allow",
	"npm run test*": "allow",
	"bun test*": "allow",
	"pnpm test*": "allow",
	"yarn test*": "allow",
	"pytest*": "allow",
	"cargo test*": "allow",
	"go test*": "allow",
	"*": "deny",
};

const ORCHESTRATOR_PERMISSION: AgentPermission = {
	read: "allow",
	glob: "allow",
	grep: "allow",
	edit: "deny",
	bash: "deny",
	task: "allow",
	webfetch: "allow",
	todowrite: "allow",
	skill: "allow",
};

const PLANNER_PERMISSION: AgentPermission = {
	read: "allow",
	glob: "allow",
	grep: "allow",
	edit: "ask",
	bash: "deny",
	task: "allow",
	webfetch: "allow",
	todowrite: "allow",
	skill: "allow",
};

const IMPLEMENTER_PERMISSION: AgentPermission = {
	read: "allow",
	glob: "allow",
	grep: "allow",
	edit: "allow",
	bash: "deny",
	task: "deny",
	webfetch: "deny",
	todowrite: "deny",
	skill: "allow",
};

const REVIEWER_PERMISSION: AgentPermission = {
	read: "allow",
	glob: "allow",
	grep: "allow",
	edit: "deny",
	bash: "deny",
	task: "deny",
	webfetch: "allow",
	todowrite: "deny",
	skill: "deny",
};

const TEST_RUNNER_PERMISSION: AgentPermission = {
	read: "allow",
	glob: "allow",
	grep: "allow",
	edit: "deny",
	bash: TEST_RUNNER_BASH,
	task: "deny",
	webfetch: "deny",
	todowrite: "deny",
	skill: "deny",
};

const DOCS_SCOPED_PERMISSION: AgentPermission = {
	read: "allow",
	glob: "allow",
	grep: "allow",
	edit: {
		"docs/**": "allow",
		"*.md": "allow",
		"*": "deny",
	},
	bash: "deny",
	task: "deny",
	webfetch: "allow",
	todowrite: "deny",
	skill: "allow",
};

const EXPLORER_PERMISSION: AgentPermission = {
	read: "allow",
	glob: "allow",
	grep: "allow",
	edit: "deny",
	bash: "deny",
	task: "deny",
	webfetch: "allow",
	todowrite: "deny",
	skill: "deny",
};

export const AGENT_META: Record<AgentRole, AgentMeta> = {
	build: {
		greekName: "odysseus",
		description:
			"Senior engineering lead -- end-to-end task ownership, multi-agent orchestration, and delivery",
		color: `"#1B5E4B"`,
		mode: "primary",
		routeKind: "edit-required",
		permission: ORCHESTRATOR_PERMISSION,
	},
	plan: {
		greekName: "athena",
		description:
			"Senior solution architect -- breaks goals into concrete, dependency-mapped implementation plans",
		color: `"#2F5D8C"`,
		mode: "primary",
		routeKind: "readonly",
		permission: PLANNER_PERMISSION,
	},
	implement: {
		greekName: "hephaestus",
		description:
			"Precision code implementer -- writes and modifies production code per specification",
		color: `"#8C4A2F"`,
		mode: "subagent",
		routeKind: "edit-required",
		permission: IMPLEMENTER_PERMISSION,
	},
	review: {
		greekName: "nemesis",
		description:
			"Code quality analyst -- reviews correctness, security, and standards compliance",
		color: `"#4B2E83"`,
		mode: "subagent",
		routeKind: "readonly",
		permission: REVIEWER_PERMISSION,
	},
	test: {
		greekName: "atalanta",
		description:
			"Test execution specialist -- runs test suites and diagnoses failures",
		color: `"#0E1A2B"`,
		mode: "subagent",
		routeKind: "execution-required",
		permission: TEST_RUNNER_PERMISSION,
	},
	document: {
		greekName: "calliope",
		description:
			"Technical writer -- creates and maintains documentation, changelogs, and API references",
		color: `"#C76B7B"`,
		mode: "subagent",
		routeKind: "readonly",
		permission: DOCS_SCOPED_PERMISSION,
	},
	explore: {
		greekName: "hermes",
		description:
			"Research and exploration specialist -- deep codebase analysis and information retrieval",
		color: `"#1CA7A6"`,
		mode: "subagent",
		routeKind: "readonly",
		permission: EXPLORER_PERMISSION,
	},
};

export const PRIMARY_AGENTS: AgentRole[] = ["build", "plan"];
export const SUBAGENT_ROLES: AgentRole[] = [
	"implement",
	"review",
	"test",
	"document",
	"explore",
];
export const ALL_AGENT_ROLES: AgentRole[] = [
	...PRIMARY_AGENTS,
	...SUBAGENT_ROLES,
];
