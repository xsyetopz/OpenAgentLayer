import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathExists, ROOT, readText, writeText } from "./install/shared.mjs";

function die(message) {
	throw new Error(message);
}

function info(message) {
	console.log(`  ✓ ${message}`);
}

function run(command, args, options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: "inherit",
			cwd: options.cwd ?? ROOT,
		});
		child.on("exit", (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(new Error(`${command} ${args.join(" ")} failed with ${code}`));
		});
		child.on("error", reject);
	});
}

function parseArgs(argv) {
	const distIndex = argv.indexOf("--dist");
	return {
		distDir:
			distIndex === -1
				? path.join(ROOT, "dist", "openagentsbtw-claude-plugin")
				: path.resolve(argv[distIndex + 1] ?? ""),
		help: argv.includes("-h") || argv.includes("--help"),
	};
}

function usage() {
	console.log(`openagentsbtw Claude plugin builder

Usage: ./build-plugin.sh [options]

Options:
  --dist DIR             Override dist target (default: ./dist/openagentsbtw-claude-plugin)
  -h, --help             Show this help`);
}

async function applyPackageModelsInFile(source, destination) {
	await fs.copyFile(source, destination);
}

async function injectConstraintsInFile(file, claudeDir) {
	let text = await readText(file, "");
	const sharedFile = path.join(claudeDir, "constraints", "shared.md");
	const packageFile = path.join(claudeDir, "constraints", "max.md");
	if (
		text.includes("__SHARED_CONSTRAINTS__") &&
		(await pathExists(sharedFile))
	) {
		text = text.replaceAll(
			"__SHARED_CONSTRAINTS__",
			await readText(sharedFile, ""),
		);
	}
	if (
		text.includes("__PACKAGE_CONSTRAINTS__") &&
		(await pathExists(packageFile))
	) {
		text = text.replaceAll(
			"__PACKAGE_CONSTRAINTS__",
			await readText(packageFile, ""),
		);
	}
	await writeText(file, text);
}

async function removeSkillPrefixInFile(file) {
	const text = await readText(file, "");
	await writeText(file, text.replaceAll("  - cca:", "  - "));
}

async function prepareDir(target) {
	await fs.rm(target, { recursive: true, force: true });
	await fs.mkdir(target, { recursive: true });
}

async function stageAgent(source, destination, claudeDir) {
	await applyPackageModelsInFile(source, destination);
	await injectConstraintsInFile(destination, claudeDir);
	await removeSkillPrefixInFile(destination);
}

async function stageAllAgents(claudeDir, distDir) {
	const sourceDir = path.join(claudeDir, "agents");
	const targetDir = path.join(distDir, "agents");
	await fs.mkdir(targetDir, { recursive: true });
	for (const entry of await fs.readdir(sourceDir, { withFileTypes: true })) {
		if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
		await stageAgent(
			path.join(sourceDir, entry.name),
			path.join(targetDir, entry.name),
			claudeDir,
		);
		info(`Agent: ${entry.name}`);
	}
}

async function copySkills(claudeDir, distDir) {
	const sourceDir = path.join(claudeDir, "skills");
	const targetDir = path.join(distDir, "skills");
	await fs.mkdir(targetDir, { recursive: true });
	for (const entry of await fs.readdir(sourceDir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		await fs.cp(
			path.join(sourceDir, entry.name),
			path.join(targetDir, entry.name),
			{
				recursive: true,
			},
		);
		info(`Skill: ${entry.name}`);
	}
}

async function stageHooks(claudeDir, distDir) {
	const hooksDist = path.join(distDir, "hooks");
	await fs.mkdir(path.join(hooksDist, "scripts"), { recursive: true });
	await fs.copyFile(
		path.join(claudeDir, "hooks", "hooks.json"),
		path.join(hooksDist, "hooks.json"),
	);
	info("hooks.json");

	const scriptsDir = path.join(claudeDir, "hooks", "scripts");
	for (const entry of await fs.readdir(scriptsDir, { withFileTypes: true })) {
		if (entry.isFile() && entry.name.endsWith(".mjs")) {
			await fs.copyFile(
				path.join(scriptsDir, entry.name),
				path.join(hooksDist, "scripts", entry.name),
			);
			info(`Hook script: ${entry.name}`);
			continue;
		}
		if (
			entry.isDirectory() &&
			["pre", "post", "session"].includes(entry.name)
		) {
			const targetDir = path.join(hooksDist, "scripts", entry.name);
			await fs.mkdir(targetDir, { recursive: true });
			const names = [];
			for (const nested of await fs.readdir(path.join(scriptsDir, entry.name), {
				withFileTypes: true,
			})) {
				if (!nested.isFile() || !nested.name.endsWith(".mjs")) continue;
				await fs.copyFile(
					path.join(scriptsDir, entry.name, nested.name),
					path.join(targetDir, nested.name),
				);
				names.push(nested.name);
			}
			info(`Hook scripts: ${entry.name}/ (${names.length} files)`);
		}
	}
}

async function validateDist(distDir) {
	console.log("\n\x1b[0;32mValidation:\x1b[0m");
	let errors = 0;
	const agentsDir = path.join(distDir, "agents");
	for (const entry of await fs.readdir(agentsDir, { withFileTypes: true })) {
		if (!entry.isFile()) continue;
		const text = await readText(path.join(agentsDir, entry.name), "");
		if (text.includes("__SHARED_CONSTRAINTS__")) {
			errors += 1;
			console.error(
				`  ✗ Found unreplaced __SHARED_CONSTRAINTS__ in ${entry.name}`,
			);
		}
	}
	if (
		(await readText(path.join(distDir, "hooks", "hooks.json"), "")).includes(
			"CLAUDE_PROJECT_DIR",
		)
	) {
		errors += 1;
		console.error("  ✗ hooks.json still references $CLAUDE_PROJECT_DIR");
	} else {
		info(`hooks.json paths use \${CLAUDE_PLUGIN_ROOT}`);
	}
	try {
		JSON.parse(
			await readText(path.join(distDir, ".claude-plugin", "plugin.json"), ""),
		);
		info("plugin.json is valid JSON");
	} catch {
		errors += 1;
		console.error("  ✗ plugin.json is invalid JSON");
	}
	if (errors > 0) {
		die(`Build failed with ${errors} error(s).`);
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		usage();
		return;
	}

	console.log("\x1b[0;32mBuilding openagentsbtw Claude plugin\x1b[0m\n");

	const buildDir = await fs.mkdtemp(
		path.join(os.tmpdir(), "openagentsbtw-build-"),
	);
	try {
		await run("node", [
			"scripts/build.mjs",
			"--out",
			buildDir,
			"--platform",
			"claude",
		]);
		const claudeDir = path.join(buildDir, "claude");
		const distDir = args.distDir;

		await prepareDir(distDir);
		await prepareDir(path.join(distDir, ".claude-plugin"));
		await fs.copyFile(
			path.join(claudeDir, ".claude-plugin", "plugin.json"),
			path.join(distDir, ".claude-plugin", "plugin.json"),
		);
		await fs.copyFile(
			path.join(claudeDir, ".claude-plugin", "marketplace.json"),
			path.join(distDir, ".claude-plugin", "marketplace.json"),
		);
		info("Plugin manifest");
		await stageAllAgents(claudeDir, distDir);
		await copySkills(claudeDir, distDir);
		await stageHooks(claudeDir, distDir);
		if (await pathExists(path.join(claudeDir, "CLAUDE.md"))) {
			await fs.copyFile(
				path.join(claudeDir, "CLAUDE.md"),
				path.join(distDir, "CLAUDE.md"),
			);
		}
		await validateDist(distDir);

		console.log(`\n\x1b[0;32mBuild complete: ${distDir}\x1b[0m\n`);
		console.log("To test locally:");
		console.log(`  claude --plugin-dir ${distDir}`);
		console.log("");
		console.log("To validate:");
		console.log(`  claude plugin validate ${distDir}`);
	} finally {
		await fs.rm(buildDir, { recursive: true, force: true });
	}
}

await main().catch((error) => {
	console.error(`Error: ${error.message}`);
	process.exitCode = 1;
});
