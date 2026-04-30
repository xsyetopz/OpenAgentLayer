import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CAVEMAN_UPSTREAM } from "../source/caveman.mjs";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(__filename, "..", "..");
const SUBMODULE_ROOT = resolve(
	REPO_ROOT,
	CAVEMAN_UPSTREAM.sourcePath || "third_party/caveman",
);

const REQUIRED_MARKERS = {
	"README.md": ["Terse like caveman", "ACTIVE EVERY RESPONSE"],
	".codex/hooks.json": ["CAVEMAN MODE ACTIVE"],
	".github/copilot-instructions.md": ["stop caveman", "normal mode"],
};

function gitHead(pathname) {
	return execFileSync("git", ["-C", pathname, "rev-parse", "HEAD"], {
		encoding: "utf8",
	}).trim();
}

function ensureSubmoduleInitialized() {
	const status = execFileSync(
		"git",
		["submodule", "status", "--", CAVEMAN_UPSTREAM.sourcePath],
		{
			cwd: REPO_ROOT,
			encoding: "utf8",
		},
	).trim();
	if (status.startsWith("-")) {
		throw new Error(
			`Caveman submodule is not initialized at ${CAVEMAN_UPSTREAM.sourcePath}. Run: git submodule update --init --recursive -- ${CAVEMAN_UPSTREAM.sourcePath}`,
		);
	}
}

export function validateUpstreamFile(relativePath, content) {
	const markers = REQUIRED_MARKERS[relativePath];
	if (!markers) throw new Error(`No validation markers for ${relativePath}`);
	for (const marker of markers) {
		if (!String(content).includes(marker)) {
			throw new Error(`Upstream ${relativePath} missing marker: ${marker}`);
		}
	}
	return true;
}

async function main() {
	ensureSubmoduleInitialized();
	const head = gitHead(SUBMODULE_ROOT);
	if (head !== CAVEMAN_UPSTREAM.ref) {
		throw new Error(
			`Caveman submodule HEAD ${head} does not match pinned ref ${CAVEMAN_UPSTREAM.ref}. Update source/caveman.mjs after submodule bump.`,
		);
	}

	for (const relativePath of CAVEMAN_UPSTREAM.files) {
		const filePath = resolve(SUBMODULE_ROOT, relativePath);
		const content = await readFile(filePath, "utf8");
		validateUpstreamFile(relativePath, content);
	}
}

if (process.argv[1] && resolve(process.argv[1]) === __filename) {
	main().catch((error) => {
		console.error(error.message);
		process.exitCode = 1;
	});
}
