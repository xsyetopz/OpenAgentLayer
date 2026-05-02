const WHITESPACE_PATTERN = /\s+/;
const YARN_BUILTINS_WITHOUT_BUN_EQUIVALENT = new Set([
	"config",
	"constraints",
	"node",
	"plugin",
	"rebuild",
	"set",
	"why",
	"workspaces",
]);

export function bunRewrite(command) {
	const normalized = command.trim();
	if (!normalized) return undefined;
	if (
		normalized === "deno" ||
		normalized.startsWith("deno ") ||
		normalized === "bun" ||
		normalized.startsWith("bun ") ||
		normalized === "bunx" ||
		normalized.startsWith("bunx ") ||
		normalized === "rtk" ||
		normalized.startsWith("rtk ")
	)
		return undefined;

	const tokens = normalized.split(WHITESPACE_PATTERN).filter(Boolean);
	const executable = tokens[0];
	const commandArguments = tokens.slice(1);
	if (!executable) return undefined;

	if (executable === "npx")
		return ["bunx", ...stripYesFlag(commandArguments)].join(" ");
	if (executable === "npm") return npmRewrite(commandArguments);
	if (executable === "pnpm") return pnpmRewrite(commandArguments);
	if (executable === "yarn") return yarnRewrite(commandArguments);
	return undefined;
}

function npmRewrite(commandArguments) {
	const subcommand = commandArguments[0];
	const rest = commandArguments.slice(1);
	if (!subcommand) return "bun install";
	switch (subcommand) {
		case "exec":
		case "x":
			return ["bunx", ...stripDoubleDash(rest)].join(" ");
		case "run":
		case "run-script":
			return ["bun", "run", ...rest].join(" ");
		case "install":
		case "i":
		case "ci":
			return ["bun", "install", ...dropFrozenLockfileAlias(rest)].join(" ");
		case "add":
			return ["bun", "add", ...rest].join(" ");
		case "remove":
		case "rm":
		case "uninstall":
		case "un":
			return ["bun", "remove", ...rest].join(" ");
		case "update":
		case "up":
			return ["bun", "update", ...rest].join(" ");
		case "outdated":
			return ["bun", "outdated", ...rest].join(" ");
		case "publish":
			return ["bun", "publish", ...rest].join(" ");
		case "pack":
			return ["bun", "pm", "pack", ...rest].join(" ");
		case "link":
			return ["bun", "link", ...rest].join(" ");
		case "list":
		case "ls":
			return ["bun", "pm", "ls", ...rest].join(" ");
		default:
			return undefined;
	}
}

function pnpmRewrite(commandArguments) {
	const subcommand = commandArguments[0];
	const rest = commandArguments.slice(1);
	if (!subcommand) return "bun install";
	switch (subcommand) {
		case "dlx":
		case "exec":
			return ["bunx", ...stripDoubleDash(rest)].join(" ");
		case "run":
			return ["bun", "run", ...rest].join(" ");
		case "install":
		case "i":
			return ["bun", "install", ...rest].join(" ");
		case "add":
			return ["bun", "add", ...rest].join(" ");
		case "remove":
		case "rm":
		case "uninstall":
			return ["bun", "remove", ...rest].join(" ");
		case "update":
		case "up":
			return ["bun", "update", ...rest].join(" ");
		case "outdated":
			return ["bun", "outdated", ...rest].join(" ");
		case "publish":
			return ["bun", "publish", ...rest].join(" ");
		case "pack":
			return ["bun", "pm", "pack", ...rest].join(" ");
		case "link":
			return ["bun", "link", ...rest].join(" ");
		case "list":
		case "ls":
			return ["bun", "pm", "ls", ...rest].join(" ");
		default:
			return undefined;
	}
}

function yarnRewrite(commandArguments) {
	const subcommand = commandArguments[0];
	const rest = commandArguments.slice(1);
	if (!subcommand || subcommand === "install") return "bun install";
	switch (subcommand) {
		case "dlx":
		case "exec":
			return ["bunx", ...stripDoubleDash(rest)].join(" ");
		case "run":
			return ["bun", "run", ...rest].join(" ");
		case "add":
			return ["bun", "add", ...rest].join(" ");
		case "remove":
			return ["bun", "remove", ...rest].join(" ");
		case "upgrade":
		case "up":
			return ["bun", "update", ...rest].join(" ");
		case "outdated":
			return ["bun", "outdated", ...rest].join(" ");
		case "pack":
			return ["bun", "pm", "pack", ...rest].join(" ");
		case "link":
			return ["bun", "link", ...rest].join(" ");
		case "list":
			return ["bun", "pm", "ls", ...rest].join(" ");
		case "npm":
			return yarnNpmRewrite(rest);
		default:
			return YARN_BUILTINS_WITHOUT_BUN_EQUIVALENT.has(subcommand)
				? undefined
				: ["bun", "run", subcommand, ...rest].join(" ");
	}
}

function yarnNpmRewrite(commandArguments) {
	const subcommand = commandArguments[0];
	const rest = commandArguments.slice(1);
	if (subcommand === "publish") return ["bun", "publish", ...rest].join(" ");
	return undefined;
}

function stripDoubleDash(commandArguments) {
	return commandArguments[0] === "--"
		? commandArguments.slice(1)
		: commandArguments;
}

function stripYesFlag(commandArguments) {
	return commandArguments.filter(
		(argument) => argument !== "-y" && argument !== "--yes",
	);
}

function dropFrozenLockfileAlias(commandArguments) {
	return commandArguments.filter((argument) => argument !== "ci");
}
