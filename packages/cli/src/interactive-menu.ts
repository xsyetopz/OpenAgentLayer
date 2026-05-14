export type InteractiveAction =
	| "setup"
	| "repair"
	| "status"
	| "validate"
	| "artifacts"
	| "deploy"
	| "skills"
	| "plugins"
	| "profiles"
	| "uninstall";

export type InteractiveCategory =
	| "start"
	| "inspect"
	| "artifacts"
	| "extend"
	| "manage";

export interface InteractiveMenuOption<T extends string> {
	value: T;
	label: string;
	hint: string;
}

export const WORKFLOW_CATEGORY_OPTIONS = [
	{
		value: "start",
		label: "Start",
		hint: "setup and repair workflows",
	},
	{
		value: "inspect",
		label: "Inspect",
		hint: "status and validation checks",
	},
	{
		value: "artifacts",
		label: "Artifacts",
		hint: "preview and deploy provider files",
	},
	{
		value: "extend",
		label: "Extend",
		hint: "skills and plugin payloads",
	},
	{
		value: "manage",
		label: "Manage",
		hint: "profiles and uninstall",
	},
] as const satisfies readonly InteractiveMenuOption<InteractiveCategory>[];

export const WORKFLOW_OPTIONS_BY_CATEGORY = {
	start: [
		{
			value: "setup",
			label: "Review and apply setup",
			hint: "profile, providers, toolchain, optional tools",
		},
		{
			value: "repair",
			label: "Repair existing install",
			hint: "inspect state, then reapply selected providers",
		},
	],
	inspect: [
		{
			value: "status",
			label: "Status and installed state",
			hint: "profile, availability, manifest drift",
		},
		{
			value: "validate",
			label: "Validate source",
			hint: "renderability and source checks",
		},
	],
	artifacts: [
		{
			value: "artifacts",
			label: "Preview generated files",
			hint: "tree or selected file content",
		},
		{
			value: "deploy",
			label: "Deploy provider files",
			hint: "write Codex, Claude, or OpenCode artifacts",
		},
	],
	extend: [
		{
			value: "skills",
			label: "Official skills",
			hint: "install from officialskills.sh tabs",
		},
		{
			value: "plugins",
			label: "Plugin payloads",
			hint: "sync provider plugin payloads",
		},
	],
	manage: [
		{
			value: "profiles",
			label: "Profiles",
			hint: "list, edit, rename, activate, remove",
		},
		{
			value: "uninstall",
			label: "Uninstall OAL",
			hint: "remove owned provider artifacts",
		},
	],
} as const satisfies Record<
	InteractiveCategory,
	readonly InteractiveMenuOption<InteractiveAction>[]
>;

export const WORKFLOW_OPTIONS = WORKFLOW_CATEGORY_OPTIONS.flatMap(
	(category) => WORKFLOW_OPTIONS_BY_CATEGORY[category.value],
);
