import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

export const RELEASE_FILES = [
	"claude/.claude-plugin/plugin.json",
	"claude/.claude-plugin/marketplace.json",
	"codex/plugin/openagentsbtw/.codex-plugin/plugin.json",
	"opencode/package.json",
];

const VERSION_ALIASES = new Map([
	["major", "major"],
	["maj", "major"],
	["minor", "minor"],
	["min", "minor"],
	["patch", "patch"],
	["pat", "patch"],
]);

function usage() {
	console.log(`openagentsbtw version bump

Usage: ./version.sh <maj|min|pat|major|minor|patch>
       ./version.sh --set X.Y.Z
       ./version.sh --print

Options:
  --set X.Y.Z   Set an explicit shared framework/tool version
  --print       Print the current shared version and exit
  -h, --help    Show this help`);
}

function parseArgs(argv) {
	if (argv.includes("-h") || argv.includes("--help")) {
		return { help: true };
	}
	if (argv.includes("--print")) {
		return { print: true };
	}
	const setIndex = argv.indexOf("--set");
	if (setIndex !== -1) {
		return { target: argv[setIndex + 1] ?? "" };
	}
	return { bump: argv[0] ?? "" };
}

function parseSemver(value) {
	const match = String(value || "")
		.trim()
		.match(/^(\d+)\.(\d+)\.(\d+)$/);
	if (!match) {
		throw new Error(`Invalid semver: ${value}`);
	}
	return match.slice(1).map((part) => Number(part));
}

export function bumpSemver(current, kind) {
	const [major, minor, patch] = parseSemver(current);
	switch (kind) {
		case "major":
			return `${major + 1}.0.0`;
		case "minor":
			return `${major}.${minor + 1}.0`;
		case "patch":
			return `${major}.${minor}.${patch + 1}`;
		default:
			throw new Error(`Unsupported bump kind: ${kind}`);
	}
}

export function resolveNextVersion(current, rawArg) {
	const normalized = String(rawArg || "")
		.trim()
		.toLowerCase();
	if (!normalized) {
		throw new Error(
			"Missing version bump kind. Expected maj|min|pat or --set X.Y.Z",
		);
	}
	if (/^\d+\.\d+\.\d+$/.test(normalized)) {
		return normalized;
	}
	const kind = VERSION_ALIASES.get(normalized);
	if (!kind) {
		throw new Error(
			`Unsupported version target: ${rawArg} (expected maj|min|pat|major|minor|patch or X.Y.Z)`,
		);
	}
	return bumpSemver(current, kind);
}

function getVersionRef(payload, relativePath) {
	if (relativePath === "claude/.claude-plugin/marketplace.json") {
		const plugin = payload?.plugins?.[0];
		if (!plugin || typeof plugin.version !== "string") {
			throw new Error(`Missing plugins[0].version in ${relativePath}`);
		}
		return {
			get value() {
				return plugin.version;
			},
			set value(next) {
				plugin.version = next;
			},
		};
	}

	if (typeof payload?.version !== "string") {
		throw new Error(`Missing version in ${relativePath}`);
	}
	return {
		get value() {
			return payload.version;
		},
		set value(next) {
			payload.version = next;
		},
	};
}

export async function readReleaseVersions(rootDir = ROOT) {
	const results = [];
	for (const relativePath of RELEASE_FILES) {
		const absolutePath = path.join(rootDir, relativePath);
		const payload = JSON.parse(await readFile(absolutePath, "utf8"));
		const versionRef = getVersionRef(payload, relativePath);
		results.push({ relativePath, absolutePath, payload, versionRef });
	}
	return results;
}

export async function getSharedVersion(rootDir = ROOT) {
	const files = await readReleaseVersions(rootDir);
	const versions = [...new Set(files.map((file) => file.versionRef.value))];
	if (versions.length !== 1) {
		throw new Error(
			`Shared release surfaces drifted: ${files
				.map((file) => `${file.relativePath}=${file.versionRef.value}`)
				.join(", ")}`,
		);
	}
	return versions[0];
}

export async function applySharedVersion(targetVersion, rootDir = ROOT) {
	parseSemver(targetVersion);
	const files = await readReleaseVersions(rootDir);
	const currentVersion = [
		...new Set(files.map((file) => file.versionRef.value)),
	];
	if (currentVersion.length !== 1) {
		throw new Error(
			`Shared release surfaces drifted: ${files
				.map((file) => `${file.relativePath}=${file.versionRef.value}`)
				.join(", ")}`,
		);
	}
	for (const file of files) {
		file.versionRef.value = targetVersion;
		await writeFile(
			file.absolutePath,
			JSON.stringify(file.payload, null, 2) + "\n",
			"utf8",
		);
	}
	return { from: currentVersion[0], to: targetVersion, files: RELEASE_FILES };
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		usage();
		return;
	}

	const current = await getSharedVersion();
	if (args.print) {
		console.log(current);
		return;
	}

	const next = resolveNextVersion(current, args.target || args.bump);
	if (next === current) {
		console.log(`Version unchanged: ${current}`);
		return;
	}

	const result = await applySharedVersion(next);
	console.log(`Bumped shared version ${result.from} -> ${result.to}`);
	for (const file of result.files) {
		console.log(`- ${file}`);
	}
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
	main().catch((error) => {
		console.error(error.message);
		process.exitCode = 1;
	});
}
