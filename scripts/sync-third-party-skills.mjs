#!/usr/bin/env bun
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const GIT_SUFFIX_PATTERN = /\.git$/u;

const UPSTREAMS = [
	{
		branch: "main",
		id: "caveman",
		path: "third_party/caveman",
		remote: "https://github.com/juliusbrussee/caveman.git",
		skills: [
			{
				body: "third_party/caveman/skills/caveman/SKILL.md",
				category: "caveman-family",
				description:
					"Ultra-terse response mode that compresses assistant prose while preserving technical substance. Supports off, lite, full, ultra, wenyan-lite, wenyan, and wenyan-ultra. Use when the user wants fewer tokens, shorter answers, or Caveman mode.",
				id: "caveman",
				routeContract: "readonly",
				title: "Caveman",
				tools: ["read", "search"],
				triggers: ["caveman"],
				upstreamName: "caveman",
			},
			{
				body: "third_party/caveman/skills/caveman-commit/SKILL.md",
				category: "caveman-family",
				description:
					"Draft terse commit messages in Caveman style without changing git state.",
				id: "caveman-commit",
				routeContract: "readonly",
				title: "Caveman Commit",
				tools: ["read", "search"],
				triggers: ["caveman-commit", "commit message"],
				upstreamName: "caveman-commit",
			},
			{
				body: "third_party/caveman/skills/compress/SKILL.md",
				category: "caveman-family",
				description:
					"Compress prose-first memory/docs files into Caveman style, preserving code, links, and structure while saving a .original.md backup.",
				id: "caveman-compress",
				routeContract: "edit-required",
				supportFiles: [
					"__init__.py",
					"__main__.py",
					"benchmark.py",
					"cli.py",
					"compress.py",
					"detect.py",
					"validate.py",
				].map((file) => ({
					category: "script",
					source: `third_party/caveman/skills/compress/scripts/${file}`,
					target: `scripts/${file}`,
				})),
				title: "Caveman Compress",
				tools: ["read", "search"],
				triggers: ["caveman-compress", "compress memory file"],
				upstreamName: "compress",
			},
			{
				body: "third_party/caveman/skills/caveman-review/SKILL.md",
				category: "caveman-family",
				description:
					"Produce one-line or ultra-terse code review verdicts when the user explicitly asks for Caveman review output.",
				id: "caveman-review",
				routeContract: "readonly",
				title: "Caveman Review",
				tools: ["read", "search"],
				triggers: ["caveman-review", "terse review"],
				upstreamName: "caveman-review",
			},
		],
	},
	{
		branch: "main",
		id: "taste-skill",
		path: "third_party/taste-skill",
		remote: "https://github.com/Leonxlnx/taste-skill.git",
		skills: [
			[
				"taste",
				"Taste",
				"Default all-rounder for premium frontend output without forcing one narrow style.",
				"taste-skill",
				"design-taste-frontend",
			],
			[
				"taste-output",
				"Taste Output",
				"Complete-output enforcement for frontend work.",
				"output-skill",
				"full-output-enforcement",
			],
			[
				"taste-redesign",
				"Taste Redesign",
				"Upgrade existing websites and apps by auditing current UI, then improving layout, hierarchy, and polish.",
				"redesign-skill",
				"redesign-taste-frontend",
			],
			[
				"taste-images",
				"Taste Images",
				"Image-first frontend reference workflow for premium website implementation.",
				"image-to-code-skill",
				"image-to-code",
			],
			[
				"taste-imagegen",
				"Taste Imagegen",
				"Dedicated image-generation-first workflow for premium website design references.",
				"imagegen-frontend-web",
				"imagegen-frontend-web",
			],
			[
				"taste-brutalist",
				"Taste Brutalist",
				"Industrial brutalist UI direction with Swiss typography and high contrast.",
				"brutalist-skill",
				"brutalist-design-taste",
			],
			[
				"taste-gpt",
				"Taste GPT",
				"GPT/Codex-oriented premium frontend skill with strict layout and motion rules.",
				"gpt-tasteskill",
				"gpt-taste-frontend",
			],
			[
				"taste-minimalist",
				"Taste Minimalist",
				"Minimalist editorial product UI with restrained palettes and crisp structure.",
				"minimalist-skill",
				"minimalist-design-taste",
			],
			[
				"taste-soft",
				"Taste Soft",
				"Soft, expensive-looking UI direction with calm contrast and premium whitespace.",
				"soft-skill",
				"soft-design-taste",
			],
			[
				"taste-stitch",
				"Taste Stitch",
				"Google Stitch-compatible semantic design rules with upstream DESIGN.md guidance.",
				"stitch-skill",
				"stitch-design-taste",
			],
		].map(([id, title, description, upstreamDirectory, upstreamName]) => ({
			body: `third_party/taste-skill/skills/${upstreamDirectory}/SKILL.md`,
			category: "taste-family",
			description,
			id,
			routeContract: "edit-required",
			supportFiles:
				id === "taste-stitch"
					? [
							{
								category: "reference",
								source: "third_party/taste-skill/skills/stitch-skill/DESIGN.md",
								target: "reference/upstream/DESIGN.md",
							},
						]
					: [],
			title,
			tools: ["read", "search", "edit"],
			triggers: ["frontend", "ui", "ux", "design", "polish"],
			upstreamName,
		})),
	},
];

const root = process.cwd();
const lock = { sources: {} };

for (const upstream of UPSTREAMS) {
	await ensureSubmodule(upstream);
	const commit = (
		await run("git", ["-C", upstream.path, "rev-parse", "HEAD"])
	).trim();
	lock.sources[upstream.id] = {
		branch: upstream.branch,
		commit,
		path: upstream.path,
		remote: upstream.remote,
	};
	for (const skill of upstream.skills) {
		await writeSkillOverlay(skill, upstream, commit);
	}
}

await writeFile(
	join(root, "upstream-sources.lock.json"),
	`${JSON.stringify(lock, null, 2)}\n`,
);

async function ensureSubmodule(upstream) {
	await run("git", ["submodule", "sync", "--recursive", upstream.path]);
	await run("git", [
		"submodule",
		"update",
		"--init",
		"--remote",
		"--recursive",
		upstream.path,
	]);
}

async function writeSkillOverlay(skill, upstream, commit) {
	const skillDirectory = join(root, "source", "skills", skill.id);
	await rm(join(skillDirectory, "SKILL.md"), { force: true });
	await rm(join(skillDirectory, "openai.yaml"), { force: true });
	await rm(join(skillDirectory, "scripts"), { force: true, recursive: true });
	await rm(join(skillDirectory, "reference"), { force: true, recursive: true });
	await mkdir(skillDirectory, { recursive: true });
	const supportFiles = skill.supportFiles ?? [];
	const lines = [
		`id = ${tomlString(skill.id)}`,
		'kind = "skill"',
		`title = ${tomlString(skill.title)}`,
		`description = ${tomlString(skill.description)}`,
		'body = "SKILL.md"',
		'license = "MIT"',
		'compatibility = "Codex, Claude, and OpenCode Agent Skills surfaces."',
		`triggers = ${tomlArray(skill.triggers)}`,
		`when_to_use = ${tomlString(skill.description)}`,
		'invocation_mode = "manual-or-route"',
		"user_invocable = true",
		`allowed_tools = ${tomlArray(skill.tools)}`,
		`tool_grants = ${tomlArray(skill.tools)}`,
		`route_contract = ${tomlString(skill.routeContract)}`,
		"references = []",
		"scripts = []",
		"assets = []",
		"supporting_files = []",
		'surfaces = ["codex", "claude", "opencode"]',
		"",
		"[metadata]",
		'origin = "openagentlayer-upstream"',
		`source_package = ${tomlString(upstream.id)}`,
		`skill_category = ${tomlString(skill.category)}`,
		`upstream_name = ${tomlString(skill.upstreamName)}`,
		"",
		"[upstream]",
		`body = ${tomlString(skill.body)}`,
		`package = ${tomlString(upstream.id)}`,
		`repository = ${tomlString(upstream.remote.replace(GIT_SUFFIX_PATTERN, ""))}`,
		`commit = ${tomlString(commit)}`,
	];
	for (const supportFile of supportFiles) {
		lines.push(
			"",
			"[[upstream.support_files]]",
			`source = ${tomlString(supportFile.source)}`,
			`target = ${tomlString(supportFile.target)}`,
			`category = ${tomlString(supportFile.category)}`,
		);
	}
	lines.push("");
	await writeFile(join(skillDirectory, "skill.toml"), lines.join("\n"));
}

async function run(command, args) {
	const process = Bun.spawn([command, ...args], {
		stderr: "pipe",
		stdout: "pipe",
	});
	const [exitCode, stdout, stderr] = await Promise.all([
		process.exited,
		new Response(process.stdout).text(),
		new Response(process.stderr).text(),
	]);
	if (exitCode !== 0) {
		throw new Error(`${command} ${args.join(" ")} failed:\n${stderr}`);
	}
	return stdout;
}

function tomlString(value) {
	return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function tomlArray(values) {
	return `[${values.map((value) => tomlString(value)).join(", ")}]`;
}
