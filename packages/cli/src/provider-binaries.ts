import { access } from "node:fs/promises";
import { delimiter, join } from "node:path";
import type { Provider } from "@openagentlayer/source";

const PROVIDERS = ["codex", "claude", "opencode"] as const satisfies Provider[];
const PROVIDER_BINARIES: Record<Provider, string> = {
	codex: "codex",
	claude: "claude",
	opencode: "opencode",
};

export interface ProviderAvailability {
	providers: Provider[];
	skipped: { provider: Provider; binary: string; reason: string }[];
}

export function expandProviders(
	providers: readonly (Provider | "all")[],
): Provider[] {
	if (providers.includes("all")) return [...PROVIDERS];
	return [...new Set(providers)] as Provider[];
}

export async function installableProviders(
	providers: readonly (Provider | "all")[],
): Promise<ProviderAvailability> {
	const selected = expandProviders(providers);
	const available: Provider[] = [];
	const skipped: ProviderAvailability["skipped"] = [];
	for (const provider of selected) {
		const binary = PROVIDER_BINARIES[provider];
		if (await binaryExists(binary)) available.push(provider);
		else
			skipped.push({
				provider,
				binary,
				reason: `${binary} binary not found in PATH`,
			});
	}
	return { providers: available, skipped };
}

async function binaryExists(binary: string): Promise<boolean> {
	for (const directory of (process.env["PATH"] ?? "").split(delimiter)) {
		if (!directory) continue;
		try {
			await access(join(directory, binary));
			return true;
		} catch {
			// Missing binaries disable provider install instead of failing OAL setup.
		}
	}
	return false;
}
