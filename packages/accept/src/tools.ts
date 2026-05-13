import { chmod, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { OalSource, Provider } from "@openagentlayer/source";

export async function assertOpenCodeTools(targetRoot: string): Promise<void> {
	await linkToolDependencies(targetRoot);
	const previousPath = process.env["PATH"] ?? "";
	process.env["PATH"] =
		`${await installAcceptanceOalShim(targetRoot)}:${previousPath}`;
	try {
		for (const tool of [
			"manifest_inspect",
			"generated_diff",
			"rtk_report",
			"command_policy_check",
			"provider_surface_map",
		]) {
			const toolPath = join(targetRoot, `.opencode/tools/${tool}.ts`);
			const text = await readFile(toolPath, "utf8");
			if (!text.includes('import { tool } from "@opencode-ai/plugin"'))
				throw new Error(`OpenCode tool is not runnable: \`${tool}\``);
			const moduleUrl = new URL(toolPath, "file://").href;
			const module = (await import(
				`${moduleUrl}?accept=${Date.now()}`
			)) as Record<string, unknown>;
			const functionName = tool.replace(/_([a-z])/g, (_match, letter: string) =>
				letter.toUpperCase(),
			);
			const integration = module[functionName];
			if (
				!(
					integration &&
					typeof integration === "object" &&
					"execute" in integration &&
					typeof integration.execute === "function"
				)
			)
				throw new Error(
					`OpenCode tool ${tool} does not export ${functionName}.`,
				);
			const output = await integration.execute({}, toolContext(targetRoot));
			if (
				!(
					(typeof output === "string" && output.trim().length > 0) ||
					(output && typeof output === "object")
				)
			)
				throw new Error(
					`OpenCode tool ${tool} did not return a non-empty tool result.`,
				);
		}
	} finally {
		process.env["PATH"] = previousPath;
	}
}

async function linkToolDependencies(targetRoot: string): Promise<void> {
	const repoRoot = resolve(dirname(import.meta.dir), "../..");
	await symlink(
		join(repoRoot, "node_modules"),
		join(targetRoot, "node_modules"),
	).catch((error: NodeJS.ErrnoException) => {
		if (error.code !== "EEXIST") throw error;
	});
}

async function installAcceptanceOalShim(targetRoot: string): Promise<string> {
	const repoRoot = resolve(dirname(import.meta.dir), "../..");
	const binRoot = join(targetRoot, ".openagentlayer-accept", "bin");
	await mkdir(binRoot, { recursive: true });
	const shimPath = join(binRoot, "oal");
	await writeFile(
		shimPath,
		`#!/usr/bin/env bash\nexec bun "${join(repoRoot, "packages/cli/src/main.ts")}" "$@"\n`,
		"utf8",
	);
	await chmod(shimPath, 0o755);
	return binRoot;
}

function toolContext(targetRoot: string): Record<string, unknown> {
	return {
		sessionID: "acceptance",
		messageID: "acceptance",
		agent: "hephaestus",
		directory: targetRoot,
		worktree: targetRoot,
		abort: new AbortController().signal,
		metadata: () => undefined,
		ask: async () => undefined,
	};
}

export async function assertSkillSupportFiles(
	targetRoot: string,
	source: OalSource,
): Promise<void> {
	for (const skill of source.skills) {
		if (skill.upstream) continue;
		const supportFiles = skill.supportFiles ?? [];
		if (supportFiles.length === 0)
			throw new Error(`OAL skill \`${skill.id}\` has no support files`);
		for (const supportFile of supportFiles) {
			if (!supportFile.source)
				throw new Error(
					`OAL skill ${skill.id} support file ${supportFile.path} is not source-backed.`,
				);
			if (!supportFile.content?.trim())
				throw new Error(
					`OAL skill ${skill.id} support file ${supportFile.path} was not hydrated.`,
				);
			for (const provider of skill.providers) {
				const skillRoot = providerSkillRoot(provider);
				const skillPath = `${skillRoot}/${skill.id}/SKILL.md`;
				const supportPath = `${skillRoot}/${skill.id}/${supportFile.path}`;
				const skillContent = await readFile(
					join(targetRoot, skillPath),
					"utf8",
				);
				if (!skillContent.includes(supportFile.path))
					throw new Error(
						`\`${skillPath}\` does not list \`${supportFile.path}\``,
					);
				const content = await readFile(join(targetRoot, supportPath), "utf8");
				if (content.trim().length === 0)
					throw new Error(`Empty skill support file \`${supportPath}\``);
				if (content !== supportFile.content)
					throw new Error(
						`Skill support file drifted during render: ${supportPath}`,
					);
			}
		}
	}
	assertDesignSkillStandards(source);
	assertTestSkillStandards(source);
	assertMarkdownPromptStandards(source);
	assertSimplicityDiscipline(source);
	assertRuntimeSafetySkills(source);
}

function providerSkillRoot(provider: Provider): string {
	if (provider === "codex") return ".codex/openagentlayer/skills";
	if (provider === "claude") return ".claude/skills";
	return ".opencode/skills";
}

function assertDesignSkillStandards(source: OalSource): void {
	const design = source.skills.find((skill) => skill.id === "design");
	if (!design) throw new Error("Missing design skill");
	const content = supportFileContent(design, "references/api-standards.md");
	for (const term of [
		"OpenAPI",
		"JSON Schema",
		"AsyncAPI",
		"GraphQL",
		"CloudEvents",
		"Problem Details",
		"OAuth 2.0",
		"OpenID Connect",
		"RFC 9110",
	])
		if (!content.includes(term))
			throw new Error(`design skill standards missing \`${term}\``);
}

function assertTestSkillStandards(source: OalSource): void {
	const test = source.skills.find((skill) => skill.id === "testing");
	if (!test) throw new Error("Missing test skill");
	const suites = supportFileContent(test, "references/language-suites.md");
	for (const term of [
		"Bun test",
		"Vitest",
		"Jest",
		"pytest",
		"hypothesis",
		"JUnit 5",
		"TestNG",
		"Kotest",
		"Spek",
		"ScalaTest",
		"specs2",
		"Cargo/libtest",
		"cargo-nextest",
		"go test",
		"Ginkgo/Gomega",
		"xUnit.net",
		"NUnit",
		"MSTest",
		"FsCheck",
		"Expecto",
		"GoogleTest",
		"Catch2",
		"Swift Testing",
		"PHPUnit",
		"Pest",
		"RSpec",
		"ExUnit",
		"EUnit",
		"Common Test",
		"clojure.test",
		"Hspec",
		"testthat",
		"busted",
		"Bats",
		"Test::More",
		"cljs.test",
		"XCTest",
		"package:test",
		"flutter_test",
		"integration_test",
		"mod tests;",
		"foo/tests.rs",
	])
		if (!suites.includes(term))
			throw new Error(`test skill standards missing \`${term}\``);
	const script = test.supportFiles?.find(
		(file) => file.path === "scripts/detect-rust-inline-tests.mjs",
	);
	if (!script?.executable)
		throw new Error("test skill missing executable Rust inline-test detector");
	if (!script.content?.includes("mod\\s+tests\\s*\\{"))
		throw new Error(
			"Rust inline-test detector does not detect mod tests blocks.",
		);
}

function assertMarkdownPromptStandards(source: OalSource): void {
	const document = source.skills.find((skill) => skill.id === "documentation");
	if (!document) throw new Error("Missing document skill");
	const markdown = supportFileContent(document, "references/markdown.md");
	for (const term of [
		"CommonMark",
		"GitHub Flavored Markdown",
		"GitHub Markdown alerts",
		"Markdown Guide",
		"Google developer documentation",
		"Microsoft style guide",
		"Diataxis",
		"**bold**",
		"_italic_",
		"> [!NOTE]",
		"## References",
	])
		if (!markdown.includes(term))
			throw new Error(`document markdown standards missing \`${term}\``);
	const prompt = source.skills.find(
		(skill) => skill.id === "prompt-engineering",
	);
	if (!prompt) throw new Error("Missing prompt skill");
	const promptMarkdown = supportFileContent(
		prompt,
		"references/markdown-prompts.md",
	);
	for (const term of [
		"OpenAI prompt engineering",
		"Anthropic prompt engineering",
		"XML tags",
		"<instructions>",
		"<context>",
		"**MUST**",
		"**SHOULD**",
		"## References",
	])
		if (!promptMarkdown.includes(term))
			throw new Error(`prompt markdown standards missing \`${term}\``);
}

function assertSimplicityDiscipline(source: OalSource): void {
	for (const skillId of ["architecture", "implementation", "review"]) {
		const skill = source.skills.find((candidate) => candidate.id === skillId);
		if (!skill) throw new Error(`Missing \`${skillId}\` skill`);
		const content = supportFileContent(skill, "references/simplicity.md");
		for (const term of [
			"Direct source-backed code beats clever machinery",
			"Use complexity when it",
			"direct functions over factories",
			"source-backed handoffs",
		])
			if (!content.includes(term))
				throw new Error(
					`\`${skillId}\` simplicity discipline missing ${term}.`,
				);
	}
}

function assertRuntimeSafetySkills(source: OalSource): void {
	const required = {
		"privileged-execution": [
			"privileged execution",
			"argv",
			"dry-run",
			"allowlist",
		],
		"safe-deletion": ["git status", "manifest ownership", "dirty", "ambiguous"],
		"command-analysis": [
			"shell operators",
			"argv",
			"exit code",
			"substring-only",
		],
	} as const;
	for (const [skillId, terms] of Object.entries(required)) {
		const skill = source.skills.find((candidate) => candidate.id === skillId);
		if (!skill) throw new Error(`Missing \`${skillId}\` skill`);
		const supportPath =
			skillId === "privileged-execution"
				? "references/runtime.md"
				: skillId === "safe-deletion"
					? "references/checklist.md"
					: "references/commands.md";
		const content = supportFileContent(skill, supportPath);
		for (const term of terms)
			if (!content.includes(term))
				throw new Error(`\`${skillId}\` safety skill missing \`${term}\``);
	}
}

function supportFileContent(
	skill: OalSource["skills"][number],
	path: string,
): string {
	const supportFile = skill.supportFiles?.find((file) => file.path === path);
	if (!supportFile?.content)
		throw new Error(`Missing support file \`${skill.id}\`/\`${path}\``);
	return supportFile.content;
}
