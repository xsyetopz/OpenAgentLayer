import type { Provider } from "@openagentlayer/source";

export function option(args: string[], name: string): string | undefined {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
}

export function flag(args: string[], name: string): boolean {
	return args.includes(name);
}

export function required(args: string[], name: string): string {
	const found = option(args, name);
	if (!found) throw new Error(`Missing \`${name}\``);
	return found;
}

export function providerOption(rawProvider: string): Provider | "all" {
	if (
		rawProvider === "all" ||
		rawProvider === "codex" ||
		rawProvider === "claude" ||
		rawProvider === "opencode"
	)
		return rawProvider;
	throw new Error(
		`Unsupported provider \`${rawProvider}\`. Expected \`codex, claude, opencode\`, or \`all\`.`,
	);
}

export function providerOptions(rawProvider: string): (Provider | "all")[] {
	const providers = rawProvider
		.split(",")
		.map((provider) => provider.trim())
		.filter(Boolean)
		.map(providerOption);
	if (providers.includes("all")) return ["all"];
	return [...new Set(providers)] as Provider[];
}

export function scopeOption(rawScope: string): "project" | "global" {
	if (rawScope === "project" || rawScope === "global") return rawScope;
	throw new Error(`Unsupported scope ${rawScope}. Expected project or global.`);
}
