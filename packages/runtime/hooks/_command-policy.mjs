import { WHITESPACE_SPLIT_PATTERN } from "./_patterns.mjs";

const SUPPORTED_COMMANDS = new Map(
	[
		"aws",
		"cargo",
		["cat", "read"],
		"config",
		"curl",
		"deps",
		"diff",
		"discover",
		"docker",
		"dotnet",
		"env",
		"err",
		"find",
		"format",
		"gh",
		"git",
		"glab",
		"go",
		"golangci-lint",
		"grep",
		"gt",
		"jest",
		"json",
		"kubectl",
		"lint",
		"log",
		"ls",
		"mypy",
		"next",
		"pip",
		"playwright",
		"prettier",
		"prisma",
		"psql",
		"pytest",
		"rake",
		["rg", "grep"],
		"read",
		"rspec",
		"rubocop",
		"ruff",
		"session",
		"smart",
		"summary",
		"test",
		"tree",
		"tsc",
		"vitest",
		"wc",
		"wget",
	].map((command) => (Array.isArray(command) ? command : [command, command])),
);

const SHELL_WRAPPERS = new Set(["bash", "sh", "zsh"]);
const RTK_INSTALL_COMMAND = [
	"curl -fsSL https://",
	["raw", "githubusercontent", "com"].join("."),
	"/",
	["rtk-ai", "rtk", "master", "install.sh"].join("/"),
	" | sh",
].join("");
const PREFERRED_REPLACEMENTS = new Map([
	["ack", "rg"],
	["ag", "rg"],
	["exa", "eza"],
	["du", "dust"],
	["time", "hyperfine"],
]);
const AUTO_SHIM_ALTERNATE_COMMANDS = new Set(["ack", "ag", "exa", "du"]);
const SUDO_PREFIX_PATTERN = /^sudo\s+/;
const ENV_PREFIX_PATTERN = /^env\s+(?:[A-Za-z_][A-Za-z0-9_]*=[^\s]+\s+)*/;
const RAW_DIAGNOSTIC_ENV_PATTERN =
	/(?:^|\s)(?:env\s+)?OAL_RTK_RAW_DIAGNOSTIC=1(?:\s|$)/;
const HEREDOC_WRITE_PATTERN =
	/^\s*(?:cat|printf)\b[^\n]*(?:^|\s)(?:>|>>)\s*\S+[^\n]*<<[-~]?\s*['"]?[A-Za-z_][A-Za-z0-9_-]*['"]?/;
const REGEX_CONFIG_EDIT_PATTERN = /\b(sed|perl)\b[\s\S]*\.(json|ya?ml)\b/i;
const CODEX_EXEC_PATTERN = /(?:^|[\s"'`])codex\s+exec(?:\s|$)/;
const DETACHED_CODEX_LAUNCHERS = new Set([
	"docker",
	"nohup",
	"screen",
	"setsid",
	"tmux",
]);
const RTK_GREP_LEGACY_FLAGS = new Set(["-R", "-r", "--include", "--exclude"]);
const RTK_GREP_MAX_FLAGS = new Set(["-m"]);
const RTK_READ_BOUND_FLAGS = new Set([
	"-m",
	"--max-lines",
	"--tail-lines",
	"-l",
	"--level",
]);
const RTK_READ_UNSUPPORTED_RANGE_FLAGS = new Set(["--start-line"]);
const RTK_FIND_BOUND_FLAGS = new Set(["-maxdepth", "--max-depth"]);
const RTK_FIND_NARROWING_FLAGS = new Set([
	"-name",
	"-iname",
	"-path",
	"-ipath",
	"-regex",
	"-type",
	"-mtime",
	"-newer",
]);
const RTK_ONLY_SEARCH_FLAGS = new Set(["--max", "--file-type"]);
const RTK_ONLY_READ_FLAGS = new Set([
	"--max-lines",
	"--tail-lines",
	"--level",
	"--line-numbers",
]);
const RTK_META_COMMANDS = new Set([
	"--help",
	"--version",
	"-h",
	"-V",
	"config",
	"gain",
	"init",
	"proxy",
]);

export function evaluateCommandPolicy(command, options = {}) {
	const commands = commandLines(command);
	if (commands.length === 0)
		return {
			decision: "pass",
			reason: "Command inspection complete: executable command absent",
		};
	let firstWarning;
	let firstPass;
	for (const commandLine of commands) {
		const result = evaluateSingleCommand(commandLine, options);
		if (result.decision === "block") return result;
		if (result.decision === "warn") firstWarning ??= result;
		if (result.decision === "pass") firstPass ??= result;
	}
	if (firstWarning) return firstWarning;
	if (firstPass) return firstPass;
	return { decision: "pass", reason: "Command already uses RTK" };
}

function evaluateSingleCommand(command, options) {
	if (rawDiagnosticRequested(command))
		return {
			decision: "warn",
			reason: "Raw RTK diagnostic command allowed for parser verification",
			details: [
				"Use when useful: compare this output with the matching RTK command",
			],
		};
	const normalized = stripCommandPrefixes(command);
	const proxied = rtkProxyInnerCommand(normalized);
	if (proxied) {
		const delegatedCodex = evaluateCodexExecDelegation(proxied);
		if (delegatedCodex) return delegatedCodex;
		const proxiedExecutable = commandExecutable(proxied);
		if (proxiedExecutable === "nl")
			return {
				decision: "block",
				reason: "RTK read provides bounded file output for this command",
				details: ["Use: rtk read --line-numbers --max-lines <n> <file>"],
			};
		const proxiedRtkExecutable = SUPPORTED_COMMANDS.get(proxiedExecutable);
		if (proxiedRtkExecutable)
			return {
				decision: "block",
				reason: "RTK native filter is available for this command",
				details: [
					`Use: rtk ${rewriteExecutable(proxied, proxiedRtkExecutable)}`,
				],
			};
	}
	if (normalized.startsWith("rtk ") || normalized === "rtk") {
		if (isHelpOrVersionCommand(normalized))
			return { decision: "pass", reason: "RTK help/version probe is allowed" };
		const rtkBounds = evaluateRtkCommandBounds(normalized);
		if (rtkBounds) return rtkBounds;
		const unsupportedRtkCommand = evaluateUnsupportedRtkCommand(normalized);
		if (unsupportedRtkCommand) return unsupportedRtkCommand;
		return { decision: "pass", reason: "Command already uses RTK" };
	}

	const rewriteCandidate = shellInnerCommand(normalized) ?? normalized;
	const delegatedCodex = evaluateCodexExecDelegation(rewriteCandidate);
	if (delegatedCodex) return delegatedCodex;
	const heredocWrite = evaluateHeredocWrite(rewriteCandidate);
	if (heredocWrite) return heredocWrite;
	const structuredConfigEdit = evaluateStructuredConfigEdit(rewriteCandidate);
	if (structuredConfigEdit) return structuredConfigEdit;
	const toolMismatch = evaluateToolMismatch(rewriteCandidate);
	if (toolMismatch) return toolMismatch;
	const bunReplacement = options.bunRewrite?.(rewriteCandidate);
	if (bunReplacement)
		return {
			decision: "block",
			reason: "Bun command form is available for this package-manager command",
			details: [`Use: rtk proxy -- ${bunReplacement}`],
		};

	const executable = commandExecutable(normalized);
	if (!executable)
		return {
			decision: "pass",
			reason: "Command inspection complete: executable command absent",
		};

	const preferredReplacement = PREFERRED_REPLACEMENTS.get(executable);
	if (preferredReplacement) {
		if (
			options.autoShimAlternateTools &&
			AUTO_SHIM_ALTERNATE_COMMANDS.has(executable)
		)
			return {
				decision: "pass",
				reason: "Command is handled by the Codex alternate-tool shim",
			};
		return {
			decision: "block",
			reason: "OpenAgentLayer has a preferred QoL tool for this command",
			details: [`Use: ${rewriteExecutable(normalized, preferredReplacement)}`],
		};
	}

	const rtkExecutable = SUPPORTED_COMMANDS.get(executable);
	if (rtkExecutable) {
		if (options.autoShimSupportedCommands)
			return {
				decision: "pass",
				reason: "Command is handled by the Codex RTK shim",
			};
		if (options.rtkInstalled === false)
			return {
				decision: "block",
				reason:
					"RTK route needs the rtk-ai/rtk binary and successful `rtk gain`",
				details: [
					`Install: ${RTK_INSTALL_COMMAND}`,
					"Verify: rtk --version && rtk gain",
				],
			};
		if (options.rtkPolicyPresent === false)
			return {
				decision: "block",
				reason: "RTK route needs RTK.md in global or project policy paths",
				details: [
					"Initialize Claude Code: rtk init -g --auto-patch",
					"Initialize Codex: rtk init -g --codex",
					"Initialize OpenCode: rtk init -g --opencode",
					"Verify: rtk init --show",
				],
			};
		return {
			decision: "block",
			reason: "RTK command form is available",
			details: [`Use: rtk ${rewriteExecutable(normalized, rtkExecutable)}`],
		};
	}

	return {
		decision: "warn",
		reason: "RTK proxy handles this command when output may be noisy",
		details: [`Use when useful: rtk proxy -- ${normalized}`],
	};
}

function evaluateHeredocWrite(command) {
	if (!HEREDOC_WRITE_PATTERN.test(command)) return undefined;
	return {
		decision: "block",
		reason: "Shell heredoc file writes need an OAL-safe edit or commit path",
		details: [
			"Use apply_patch for repository files.",
			'Use multiple -m paragraphs for commits: rtk git commit -m "type(scope): subject" -m "Summary:\\n- ..." --trailer "Co-authored-by: Codex <noreply@openai.com>"',
			"Use for non-repo temp files when necessary: rtk proxy -- tee /tmp/file >/dev/null <<'EOF'",
		],
	};
}

function evaluateStructuredConfigEdit(command) {
	if (!REGEX_CONFIG_EDIT_PATTERN.test(command)) return undefined;
	return {
		decision: "warn",
		reason: "JSON/YAML edits need a structured editor",
		details: [
			"Use: rtk proxy -- jq <filter> <file>",
			"Use: rtk proxy -- yq <filter> <file>",
			"Use: apply_patch for focused repository edits.",
		],
	};
}

function evaluateToolMismatch(command) {
	const tokens = command.split(WHITESPACE_SPLIT_PATTERN).filter(Boolean);
	const executable = shellWrapperName(tokens[0] ?? "");
	if (
		(executable === "rg" || executable === "grep") &&
		hasOption(tokens, RTK_ONLY_SEARCH_FLAGS)
	) {
		return {
			decision: "block",
			reason: "RTK-only search flags were used with a raw search command",
			details: [
				`Use: ${rewriteSearchAsRtk(command, executable)}`,
				"Use: rtk grep <pattern> <path> -m <n> --file-type <type>",
				"Last resort after RTK options are exhausted: rtk proxy -- rg -n <pattern> <path> -g '<glob>' | head -n <n>",
			],
		};
	}
	if (executable === "read" && hasOption(tokens, RTK_ONLY_READ_FLAGS)) {
		return {
			decision: "block",
			reason: "RTK-only read flags were used with the shell read command",
			details: [
				`Use: rtk ${rewriteExecutable(command, "read")}`,
				"Use: rtk read --line-numbers --max-lines <n> <file>",
				"Use: rtk read --line-numbers --tail-lines <n> <file>",
			],
		};
	}
	return undefined;
}

function evaluateCodexExecDelegation(command) {
	const tokens = command.split(WHITESPACE_SPLIT_PATTERN).filter(Boolean);
	if (tokens[0] !== "codex" || tokens[1] !== "exec") {
		if (!CODEX_EXEC_PATTERN.test(command)) return undefined;
		if (usesDetachedLauncher(tokens)) {
			return {
				decision: "block",
				reason:
					"Detached Codex delegation can hide quota usage from the managed OAL run ledger",
				details: [
					"Use: oal codex peer batch <task>",
					"Use: oal codex agent <agent> <task>",
					"Use: oal codex route <route> <task>",
				],
			};
		}
		return managedCodexDelegationBlock();
	}
	if (
		tokens.some((token) =>
			["--help", "-h", "help", "--version", "-V"].includes(token),
		)
	)
		return undefined;
	return managedCodexDelegationBlock();
}

function managedCodexDelegationBlock() {
	return {
		decision: "block",
		reason:
			"Codex delegation should use the managed OAL path so agent runs stay visible and auditable",
		details: [
			"Use: oal codex agent <agent> <task>",
			"Use: oal codex route <route> <task>",
			"Use: oal codex peer batch <task>",
		],
	};
}

function usesDetachedLauncher(tokens) {
	const executable = shellWrapperName(tokens[0] ?? "");
	return DETACHED_CODEX_LAUNCHERS.has(executable);
}

export function normalizeCommand(command) {
	const firstLine = commandLines(command)[0];
	if (!firstLine) return "";
	return stripCommandPrefixes(firstLine);
}

function commandLines(command) {
	return String(command ?? "")
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith("#"));
}

function stripCommandPrefixes(command) {
	return command
		.replace(SUDO_PREFIX_PATTERN, "")
		.replace(ENV_PREFIX_PATTERN, "")
		.trim();
}

export function commandExecutable(command) {
	const tokens = command.split(WHITESPACE_SPLIT_PATTERN).filter(Boolean);
	if (tokens.length === 0) return "";
	if (SHELL_WRAPPERS.has(shellWrapperName(tokens[0])) && tokens[1] === "-lc") {
		const nested = tokens
			.slice(2)
			.join(" ")
			.replace(/^['"]|['"]$/g, "");
		return commandExecutable(nested);
	}
	return tokens[0];
}

function shellInnerCommand(command) {
	const tokens = command.split(WHITESPACE_SPLIT_PATTERN).filter(Boolean);
	if (SHELL_WRAPPERS.has(shellWrapperName(tokens[0])) && tokens[1] === "-lc") {
		return tokens
			.slice(2)
			.join(" ")
			.replace(/^['"]|['"]$/g, "");
	}
	return undefined;
}

function shellWrapperName(command) {
	return command.split("/").pop() ?? command;
}

function rawDiagnosticRequested(command) {
	if (RAW_DIAGNOSTIC_ENV_PATTERN.test(command)) return true;
	const nested = shellInnerCommand(command);
	return nested ? RAW_DIAGNOSTIC_ENV_PATTERN.test(nested) : false;
}

function evaluateRtkCommandBounds(command) {
	const tokens = command.split(WHITESPACE_SPLIT_PATTERN).filter(Boolean);
	if (tokens[0] !== "rtk") return undefined;
	const subcommand = tokens[1] ?? "";
	if (subcommand === "grep") return evaluateRtkGrepBounds(tokens);
	if (subcommand === "read") return evaluateRtkReadBounds(tokens);
	if (subcommand === "find") return evaluateRtkFindBounds(tokens);
	if (subcommand === "tree") return evaluateRtkTreeBounds(tokens);
	if (subcommand === "ls") return evaluateRtkLsBounds(tokens);
	return undefined;
}

function isHelpOrVersionCommand(command) {
	const tokens = command.split(WHITESPACE_SPLIT_PATTERN).filter(Boolean);
	return tokens.some((token) =>
		["--help", "-h", "help", "--version", "-V"].includes(token),
	);
}

function evaluateUnsupportedRtkCommand(command) {
	const tokens = command.split(WHITESPACE_SPLIT_PATTERN).filter(Boolean);
	const subcommand = tokens[1] ?? "";
	if (!subcommand) return undefined;
	if (RTK_META_COMMANDS.has(subcommand)) return undefined;
	if ([...SUPPORTED_COMMANDS.values()].includes(subcommand)) return undefined;
	return {
		decision: "block",
		reason: "RTK needs proxy mode for commands without a native RTK route",
		details: [
			`Use: rtk proxy -- ${tokens.slice(1).join(" ")}`,
			"Use a native RTK command only when it appears in RTK help, such as `rtk grep`, `rtk read`, or `rtk find`.",
		],
	};
}

function evaluateRtkGrepBounds(tokens) {
	if (tokens.some((token) => RTK_GREP_LEGACY_FLAGS.has(token)))
		return {
			decision: "block",
			reason: "RTK grep works best with native compact options",
			details: ["Use: rtk grep <pattern> <path> -m <n> --file-type <type>"],
		};
	if (!hasOption(tokens, RTK_GREP_MAX_FLAGS))
		return {
			decision: "block",
			reason: "RTK grep needs an explicit result cap",
			details: ["Use: rtk grep <pattern> <path> -m <n>"],
		};
	return undefined;
}

function evaluateRtkReadBounds(tokens) {
	const unsupportedRangeFlag = tokens.find((token) =>
		RTK_READ_UNSUPPORTED_RANGE_FLAGS.has(token),
	);
	if (unsupportedRangeFlag)
		return {
			decision: "block",
			reason: "RTK read does not support arbitrary start-line ranges",
			details: [
				"Use: rtk read --line-numbers --max-lines <n> <file>",
				"For a line range, use: rtk proxy -- sed -n '<start>,<end>p' <file>",
			],
		};
	if (!hasOption(tokens, RTK_READ_BOUND_FLAGS))
		return {
			decision: "block",
			reason: "RTK read needs an explicit output bound",
			details: [
				"Use: rtk read --max-lines <n> <file>",
				"Use: rtk read --level minimal <file>",
			],
		};
	return undefined;
}

function evaluateRtkFindBounds(tokens) {
	if (!hasOption(tokens, RTK_FIND_BOUND_FLAGS))
		return {
			decision: "block",
			reason: "RTK find needs an explicit traversal bound",
			details: [
				"Use: rtk find <path> -maxdepth <n> -type f -name '<glob>'",
				"Use: fd <pattern> <path> --max-depth <n> --max-results <n>",
			],
		};
	if (!hasOption(tokens, RTK_FIND_NARROWING_FLAGS))
		return {
			decision: "block",
			reason: "RTK find needs a narrowing predicate for large codebases",
			details: [
				"Use: rtk find <path> -maxdepth <n> -type f -name '<glob>'",
				"Use: rtk git ls-files <pathspec>",
			],
		};
	return undefined;
}

function evaluateRtkTreeBounds(tokens) {
	if (!hasOption(tokens, new Set(["-L", "--level"])))
		return {
			decision: "block",
			reason: "RTK tree needs an explicit depth for large codebases",
			details: ["Use: rtk tree <path> -L <n>"],
		};
	return undefined;
}

function evaluateRtkLsBounds(tokens) {
	if (tokens.some((token) => token === "-R" || token === "--recursive"))
		return {
			decision: "block",
			reason: "Recursive ls is too broad for large codebases",
			details: [
				"Use: rtk find <path> -maxdepth <n> -type f -name '<glob>'",
				"Use: fd <pattern> <path> --max-depth <n> --max-results <n>",
			],
		};
	return undefined;
}

function hasOption(tokens, options) {
	return tokens.some((token) => {
		for (const option of options) {
			if (token === option || token.startsWith(`${option}=`)) return true;
		}
		return false;
	});
}

function rtkProxyInnerCommand(command) {
	const tokens = command.split(WHITESPACE_SPLIT_PATTERN).filter(Boolean);
	if (tokens[0] !== "rtk" || tokens[1] !== "proxy") return undefined;
	const separator = tokens[2] === "--" ? 3 : 2;
	return tokens.slice(separator).join(" ");
}

function rewriteExecutable(command, replacement) {
	const [executable, ...rest] = command
		.split(WHITESPACE_SPLIT_PATTERN)
		.filter(Boolean);
	if (!executable) return replacement;
	return [replacement, ...rest].join(" ");
}

function rewriteSearchAsRtk(command, executable) {
	const replacement = executable === "rg" ? "grep" : executable;
	const tokens = rewriteExecutable(command, replacement)
		.split(WHITESPACE_SPLIT_PATTERN)
		.filter(Boolean);
	const rewritten = [];
	for (const token of tokens) {
		if (token === "--max") {
			rewritten.push("-m");
			continue;
		}
		if (token.startsWith("--max=")) {
			rewritten.push("-m", token.slice("--max=".length));
			continue;
		}
		rewritten.push(token);
	}
	return `rtk ${rewritten.join(" ")}`;
}
