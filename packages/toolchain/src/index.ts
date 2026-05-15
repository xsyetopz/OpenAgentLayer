export {
	OFFICIAL_SKILL_ADD_COMMAND_PATTERN,
	OFFICIAL_SKILL_CATALOG,
	OFFICIAL_SKILL_CATEGORIES,
	OFFICIAL_SKILL_INSTALL_COMMAND_PATTERN,
	OFFICIAL_SKILL_PATH_COMMAND_PATTERN,
	OFFICIAL_SKILLS_BASE_URL,
	OFFICIAL_SKILLS_HOSTNAME,
	type OfficialSkillCatalogEntry,
	type OfficialSkillCategory,
	type OfficialSkillId,
	officialSkillBundleLinks,
	officialSkillById,
	officialSkillCategoryMap,
	officialSkillIds,
	officialSkillLinks,
	parseOfficialSkillPage,
} from "./official-skills";

import {
	CONTEXT7_DASHBOARD_URL,
	RTK_INSTALL_COMMAND,
	RTK_INSTALL_SCRIPT_URL,
} from "@openagentlayer/source";
import {
	OFFICIAL_SKILL_CATALOG,
	type OfficialSkillCatalogEntry,
	type OfficialSkillId,
	officialSkillById,
} from "./official-skills";

export type OperatingSystem = "macos" | "linux";
export type PackageManager =
	| "brew"
	| "apt"
	| "dnf"
	| "pacman"
	| "zypper"
	| "apk";
export type OptionalTool = "ctx7" | "deepwiki" | "playwright" | OfficialSkillId;
export type OptionalToolAction = "install" | "remove";
export type OptionalToolProvider = "codex" | "claude" | "opencode";
export type OptionalToolScope = "global" | "project";

export interface ToolchainOptions {
	os: OperatingSystem;
	packageManager?: PackageManager;
	hasHomebrew?: boolean;
	includeOptional?: OptionalTool[];
	providers?: OptionalToolProvider[];
	context7ApiKey?: string;
}

export interface ToolchainPlan {
	os: OperatingSystem;
	packageManager: PackageManager;
	requiredTools: string[];
	optionalTools: string[];
	commands: string[];
	notes: string[];
}

export interface OptionalFeatureCommandOptions {
	providers?: OptionalToolProvider[];
	scope?: OptionalToolScope;
	context7ApiKey?: string;
	repoRoot?: string;
	targetRoot?: string;
	officialSkills?: readonly OfficialSkillCatalogEntry[];
}

export interface Context7ApiKeyStatus {
	present: boolean;
	valid: boolean;
	source?: string;
}

export { CONTEXT7_DASHBOARD_URL, RTK_INSTALL_COMMAND, RTK_INSTALL_SCRIPT_URL };

const CONTEXT7_API_KEY_PATTERN = /^ctx7sk-[A-Za-z0-9_-]{16,}$/;

const OPTIONAL_TOOL_LABELS: Record<OptionalTool, string> = {
	ctx7: "ctx7 [CLI]",
	deepwiki: "deepwiki [MCP]",
	playwright: "playwright [CLI]",
	...Object.fromEntries(
		OFFICIAL_SKILL_CATALOG.map((entry) => [
			entry.id,
			`${entry.publisher} ${entry.name} [skill]`,
		]),
	),
} as Record<OptionalTool, string>;

const CORE_TOOLS = [
	"bun", // JS runtime and package manager for CLI and scripts.
	"ripgrep", // Fast recursive search for code/data inspection.
	"fd", // Fast file discovery with ignore support.
	"fzf", // Interactive fuzzy finder for local workflows.
	"bat", // Syntax-highlighted file preview in terminal.
	"eza", // Improved directory listing with metadata.
	"git-delta", // Readable syntax-aware Git diff pager.
	"jq", // JSON query and transformation primitive.
	"yq", // YAML/JSON query and editing primitive.
	"just", // Task runner for repeatable project commands.
	"direnv", // Repo-local environment loading automation.
	"gum", // Scriptable prompts/menus/spinners for shell UX.
	"mise", // Runtime/tool version manager for reproducibility.
	"zoxide", // Faster directory jumping utility.
	"dust", // Disk usage analyzer for quick storage checks.
	"hyperfine", // Command benchmarking for performance comparisons.
	"entr", // Lightweight file change trigger runner.
	"gh", // GitHub CLI for PR/issues/actions/releases.
	"lazygit", // Interactive Git TUI for local workflows.
	"tmux", // Terminal multiplexing for multi-session runs.
	"btop", // Interactive process/system monitor.
	"shellcheck", // Static analysis for shell script correctness.
	"shfmt", // Shell formatter for consistent script style.
	"ast-grep", // AST-aware search/rewrite for safer edits.
	"sd", // Safer regex replacement tool for text rewrites.
	"tokei", // Code statistics by language and file type.
	"gitleaks", // Secret scanning in source and history.
	"pre-commit", // Git hook runner for local quality gates.
	"watchexec", // File watcher for command reruns on changes.
	"bats-core", // Bash test framework for shell/CLI tests.
	"comby", // Structural multi-language search and rewrite.
	"dasel", // Structured data query/edit across JSON/YAML/TOML/XML.
	"jc", // Convert command output into JSON.
	"jo", // Build JSON in shell scripts without quoting issues.
	"xan", // Fast CSV slicing/stats/inspection utility.
	"miller", // CSV/TSV/JSONL data wrangling from shell.
	"difftastic", // Syntax-aware diff for review-changes signal quality.
	"git-absorb", // Auto-create fixup commits from local changes.
	"actionlint", // Lint GitHub Actions workflow files.
	"hadolint", // Lint Dockerfiles and container best practices.
	"trivy", // Vulnerability scanning for filesystems/images/deps.
	"syft", // SBOM generation for dependencies and artifacts.
	"grype", // Vulnerability scanning against SBOM/images.
	"process-compose", // Local multi-process service orchestration.
	"overmind", // Procfile-based process supervision.
	"poppler", // PDF tools: pdftotext/pdfinfo/pdfimages.
	"exiftool", // Metadata inspection and editing for media/docs.
	"pandoc", // Document format conversion toolkit.
	"graphviz", // Graph rendering (dot) for diagrams/dependencies.
	"duckdb", // Local SQL over CSV/JSON/Parquet/log datasets.
	"lsof", // Inspect open files/sockets/ports/process handles.
	"strace", // Linux syscall trace-data-flow for process debug-failures.
	"dtruss", // macOS syscall trace-data-flow via DTrace tooling.
	"sqlite3", // Local database CLI for structured inspection.
	"file", // Byte-level file type detection via libmagic.
	"imagemagick", // Image inspect/convert/resize workflows.
	"ffmpeg", // Audio/video/media stream inspection and conversion.
	"python3", // Python runtime for automation and package tooling.
] as const;
const PYTHON_PACKAGES = [
	"pillow", // Image loading, conversion, resizing, metadata.
	"pymupdf", // PDF rendering and text/image extraction.
	"pypdf", // Lightweight PDF split/merge/metadata handling.
	"pdfplumber", // PDF table and structured text extraction.
	"python-magic", // MIME/file-type detection from bytes.
	"charset-normalizer", // Robust text encoding detection.
	"chardet", // Legacy/fallback character encoding detection.
	"beautifulsoup4", // Forgiving HTML/XML parsing.
	"lxml", // Fast XML/HTML parser with XPath support.
	"markdown-it-py", // CommonMark-compatible Markdown parsing.
	"mistune", // Alternate Markdown parsing/rendering.
	"python-frontmatter", // Markdown frontmatter parsing support.
	"ruamel.yaml", // YAML round-trip editing preserving comments.
	"tomlkit", // TOML round-trip editing preserving formatting.
	"jsonschema", // JSON/config/schema validation engine.
	"pydantic", // Structured data validation and typing models.
	"httpx", // Modern sync/async HTTP client.
	"aiofiles", // Async file I/O for Python workflows.
	"tenacity", // Retry/backoff control for flaky operations.
	"orjson", // High-performance JSON parser/serializer.
	"jsonlines", // JSONL stream and dataset utilities.
	"packaging", // Correct version/specifier parsing.
	"pathspec", // Gitignore-style path matching support.
	"GitPython", // Git automation from Python.
	"dulwich", // Pure-Python Git plumbing fallback.
	"tree-sitter", // Structural parsing foundation.
	"tree-sitter-language-pack", // Bundled grammars for many languages.
	"libcst", // Concrete Python rewriting preserving formatting.
	"pygments", // Syntax tokenization/highlighting helpers.
	"rapidfuzz", // Fast fuzzy matching for names/text.
	"regex", // Enhanced regex engine beyond stdlib re.
	"watchdog", // File watch events for automation loops.
	"rich", // Rich terminal formatting and tracebacks.
	"typer", // Rapid CLI scaffolding for Python tooling.
	"tqdm", // Progress bars for long-running operations.
	"pandas", // Dataframe tooling for CSV/XLSX/table data.
	"polars", // Fast dataframe processing for large datasets.
	"pyarrow", // Arrow/Parquet data interchange support.
	"duckdb", // SQL over local structured datasets in Python.
	"openpyxl", // XLSX read/write support.
	"python-docx", // DOCX read/write support.
	"python-pptx", // PPTX read/write support.
	"odfpy", // ODT/ODS document support.
	"networkx", // Graph modeling for dependencies/flows.
	"graphviz", // Python graph rendering bindings.
	"matplotlib", // Quick plotting/visualization utilities.
	"numpy", // Numeric and ndarray foundation.
	"scipy", // Scientific computing and algorithm fallback.
	"opencv-python", // Advanced image/video processing.
	"pytesseract", // OCR wrapper (expects native tesseract).
	"imagehash", // Perceptual image hashing and deduplicate-code.
	"mutagen", // Audio metadata reading/writing.
	"jinja2", // Template rendering for generated artifacts.
	"hypothesis", // Property-based test case generation.
	"deepdiff", // Structured object diffing.
	"dictdiffer", // Lightweight dict/list diffing.
	"xxhash", // Fast non-cryptographic content hashing.
	"blake3", // Fast strong hashing utility.
	"psutil", // Process/system inspection utilities.
	"humanize", // Human-readable sizes/durations/counts.
	"tabulate", // Table rendering in terminal output.
	"send2trash", // Safer delete-to-trash operations.
	"filelock", // Cross-process file lock coordination.
	"portalocker", // Portable file locking fallback.
] as const;
const MERMAID_CLI_INSTALL = "bun install -g @mermaid-js/mermaid-cli";
const BREW_INSTALL =
	'/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"';
const BUN_INSTALL = ["curl -fsSL https://bun.sh/install", "bash"].join(" | ");
const RTK_INSTALL = RTK_INSTALL_COMMAND;

export function planToolchainInstall(options: ToolchainOptions): ToolchainPlan {
	const packageManager =
		options.packageManager ?? defaultPackageManager(options.os);
	const optionalTools = options.includeOptional ?? [];
	const providers = options.providers ?? ["codex", "claude", "opencode"];
	const commands = [
		...bootstrapCommands(options.os, packageManager, options.hasHomebrew),
		BUN_INSTALL,
		installCommand(packageManager, packageManagerTools(packageManager)),
		...pythonBootstrapCommands(packageManager),
		RTK_INSTALL,
		"rtk --version",
		"rtk gain",
		"rtk init -g --auto-patch",
		"rtk init -g --codex",
		"rtk init -g --opencode",
		"rtk init --show",
		"rtk grep --help",
		"rtk read --help",
		"rtk find --help",
		"rg --help",
		"fd --help",
		MERMAID_CLI_INSTALL,
		...pythonPackageInstallCommands(),
		...(optionalTools.includes("ctx7")
			? [
					"bun install -g ctx7",
					"ctx7 --version",
					`# Optional: get a Context7 API key for higher rate limits at ${CONTEXT7_DASHBOARD_URL}`,
				]
			: []),
		...optionalFeatureCommands("install", optionalTools, {
			providers,
			scope: "global",
			...(options.context7ApiKey
				? { context7ApiKey: options.context7ApiKey }
				: {}),
		}),
	];
	return {
		os: options.os,
		packageManager,
		requiredTools: [...CORE_TOOLS, "rtk"],
		optionalTools: optionalTools.map(optionalToolLabel),
		commands,
		notes: [
			"Run as dry-run first; install mutates user machine state.",
			"Bun is installed before OAL-managed package-manager rewrites can run.",
			"RTK must be verified with `rtk gain` to avoid the wrong rtk package.",
			"RTK init must create global or project RTK.md policy before OAL hooks enforce RTK-wrapped commands.",
			"Keep `rtk gain` at or above 80%; drops below 80% require command/output efficiency work before release.",
			"Use `rtk gain` to confirm token savings; prefer capped `rtk grep`, bounded `rtk read`, and bounded `rtk find` for high-volume repository inspection.",
			"RTK flags are not raw tool flags: do not pass `--max` or `--file-type` to plain `rg`/`grep`, and do not pass `--max-lines` or `--level` to shell `read`.",
			"Use raw tool fallbacks only after RTK options are exhausted; prefer `rtk grep`, `rtk read`, `rtk find`, and `rtk git ls-files`.",
			"Use `rtk proxy -- rg` and `rtk proxy -- fd` for provider-shared source discovery only as a last resort; both respect `.gitignore` by default.",
			"Use `rtk git ls-files` when a task explicitly requires tracked files only.",
			"Use `jq`/`yq` for structured config, `shellcheck`/`shfmt` for shell, `hyperfine` for speed claims, `ast-grep`/`sd` for careful mechanical rewrites, and `gitleaks` for secret checks.",
			"Python tooling support installs Python 3, pip bootstrap, and a broad automation/data/media package set for agent workflows.",
		],
	};
}

export function renderToolchainPlan(plan: ToolchainPlan): string {
	return [
		"# OpenAgentLayer Toolchain Plan",
		"",
		`OS: ${plan.os}`,
		`Package manager: ${plan.packageManager}`,
		`Required tools: ${plan.requiredTools.join(", ")}`,
		`Optional tools: ${plan.optionalTools.join(", ") || "none"}`,
		"",
		"Commands:",
		"```bash",
		...plan.commands,
		"```",
		"",
		"Notes:",
		...plan.notes.map((note) => `- ${note}`),
		"",
	].join("\n");
}

export function optionalToolLabel(tool: OptionalTool): string {
	return OPTIONAL_TOOL_LABELS[tool];
}

export function context7ApiKeyStatus(
	env: NodeJS.ProcessEnv = process.env,
): Context7ApiKeyStatus {
	const entries = [
		["CONTEXT7_API_KEY", env["CONTEXT7_API_KEY"]],
		["CTX7_API_KEY", env["CTX7_API_KEY"]],
	] as const;
	const found = entries.find(([, value]) => typeof value === "string");
	if (!found) return { present: false, valid: false };
	const [source, rawValue] = found;
	const value = rawValue?.trim() ?? "";
	return {
		present: value.length > 0,
		valid: isExpectedContext7ApiKey(value),
		source,
	};
}

export function isExpectedContext7ApiKey(value: string): boolean {
	return CONTEXT7_API_KEY_PATTERN.test(value.trim());
}

function defaultPackageManager(os: OperatingSystem): PackageManager {
	return os === "macos" ? "brew" : "apt";
}

function bootstrapCommands(
	os: OperatingSystem,
	packageManager: PackageManager,
	hasHomebrew = true,
): string[] {
	if (os === "macos" && packageManager === "brew" && !hasHomebrew)
		return [BREW_INSTALL];
	if (os === "linux") return [linuxRefreshCommand(packageManager)];
	return [];
}

function installCommand(
	packageManager: PackageManager,
	tools: readonly string[],
): string {
	switch (packageManager) {
		case "brew":
			return `brew install ${tools.join(" ")}`;
		case "apt":
			return `sudo apt-get install -y ${tools.join(" ")}`;
		case "dnf":
			return `sudo dnf install -y ${tools.join(" ")}`;
		case "pacman":
			return `sudo pacman -S --needed ${tools.join(" ")}`;
		case "zypper":
			return `sudo zypper install -y ${tools.join(" ")}`;
		default:
			return `sudo apk add ${tools.join(" ")}`;
	}
}

function packageManagerTools(
	packageManager: PackageManager,
): readonly string[] {
	const mapped = CORE_TOOLS.map((tool) =>
		packageManagerToolName(packageManager, tool),
	).filter(Boolean) as string[];
	if (packageManager === "brew") return mapped.filter((tool) => tool !== "bun");
	return mapped;
}

function packageManagerToolName(
	packageManager: PackageManager,
	tool: (typeof CORE_TOOLS)[number],
): string | undefined {
	if (packageManager === "brew") {
		const brewAliases: Partial<Record<(typeof CORE_TOOLS)[number], string>> = {
			miller: "miller",
			python3: "python",
		};
		return brewAliases[tool] ?? tool;
	}
	if (tool === "python3") return "python3";
	if (tool === "dtruss") return undefined;
	if (tool === "strace" && packageManager === "brew") return undefined;
	if (tool === "difftastic") return packageManager === "apt" ? undefined : tool;
	if (tool === "process-compose")
		return packageManager === "apt" ? undefined : tool;
	if (tool === "overmind") return packageManager === "apt" ? undefined : tool;
	if (tool === "git-absorb") return packageManager === "apt" ? undefined : tool;
	return tool;
}

function linuxRefreshCommand(packageManager: PackageManager): string {
	switch (packageManager) {
		case "apt":
			return "sudo apt-get update";
		case "dnf":
			return "sudo dnf check-update || true";
		case "pacman":
			return "sudo pacman -Sy";
		case "zypper":
			return "sudo zypper refresh";
		case "apk":
			return "sudo apk update";
		default:
			return "brew update";
	}
}

function pythonBootstrapCommands(packageManager: PackageManager): string[] {
	if (packageManager === "brew")
		return [
			"python3 --version || python --version",
			"python3 -m pip --version || python3 -m ensurepip --upgrade",
			"python3 -m pip install --upgrade pip",
		];
	return [
		"python3 --version",
		"python3 -m pip --version || python3 -m ensurepip --upgrade",
		"python3 -m pip install --upgrade pip",
	];
}

function pythonPackageInstallCommands(chunkSize = 20): string[] {
	const commands: string[] = [];
	for (let index = 0; index < PYTHON_PACKAGES.length; index += chunkSize) {
		const chunk = PYTHON_PACKAGES.slice(index, index + chunkSize);
		commands.push(`python3 -m pip install --upgrade ${chunk.join(" ")}`);
	}
	return commands;
}

export function optionalFeatureCommands(
	action: OptionalToolAction,
	optionalTools: OptionalTool[],
	options: OptionalFeatureCommandOptions = {},
): string[] {
	const commands: string[] = [];
	const providers = options.providers ?? ["codex", "claude", "opencode"];
	if (optionalTools.includes("ctx7")) {
		commands.push(ctx7Command(action, options));
	}
	if (optionalTools.includes("deepwiki") && providers.includes("claude"))
		commands.push(
			action === "install"
				? "claude mcp add oal-deepwiki-docs --scope user -- bunx ctx7@latest mcp deepwiki"
				: "claude mcp remove oal-deepwiki-docs --scope user",
		);
	if (optionalTools.includes("playwright")) {
		commands.push(
			action === "install"
				? "bunx -p playwright playwright install --with-deps"
				: "bunx -p playwright playwright uninstall --all",
		);
	}
	for (const tool of optionalTools) {
		const command =
			options.officialSkills?.find((entry) => entry.id === tool) ??
			officialSkillById(tool);
		if (!command) continue;
		commands.push(...officialSkillCommand(action, command, options.scope));
	}
	return commands;
}

function officialSkillCommand(
	action: OptionalToolAction,
	command: { repo: string; skill: string; pathOnly?: boolean },
	scope: OptionalToolScope = "global",
): string[] {
	const scopeFlag = scope === "global" ? " --global" : "";
	if (action === "remove")
		return [`bunx skills remove ${command.skill} --yes${scopeFlag}`];
	if (command.pathOnly)
		return [`bunx skills add ${command.repo} --yes${scopeFlag}`];
	return [
		`bunx skills add ${command.repo} --skill ${command.skill} --yes${scopeFlag}`,
	];
}

function ctx7Command(
	action: OptionalToolAction,
	options: OptionalFeatureCommandOptions,
): string {
	const verb = action === "install" ? "setup" : "remove";
	const providers = options.providers ?? ["codex", "claude", "opencode"];
	const providerFlags = providers.map((provider) => `--${provider}`);
	const scopeFlags = options.scope === "project" ? ["--project"] : [];
	return [
		"ctx7",
		verb,
		"--cli",
		"--yes",
		...providerFlags,
		...scopeFlags,
		...(action === "install" && options.context7ApiKey
			? [`--api-key=${shellQuote(options.context7ApiKey)}`]
			: []),
	].join(" ");
}

function shellQuote(value: string): string {
	return `'${value.replaceAll("'", "'\\''")}'`;
}
