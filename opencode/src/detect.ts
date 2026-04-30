import type { ProviderAvailability } from "./types.ts";

async function fileExists(path: string): Promise<boolean> {
	try {
		return await Bun.file(path).exists();
	} catch {
		return false;
	}
}

async function hasGitHubCopilot(): Promise<boolean> {
	const home = process.env["HOME"] ?? "";
	const userProfile = process.env["USERPROFILE"] ?? "";
	const resolvedHome = process.platform === "win32" ? userProfile : home;
	if (!resolvedHome) {
		return false;
	}

	const configHome =
		process.platform === "win32"
			? (process.env["APPDATA"] ?? `${resolvedHome}/AppData/Roaming`)
			: (process.env["XDG_CONFIG_HOME"] ?? `${resolvedHome}/.config`);
	const copilotPaths =
		process.platform === "win32"
			? [
					`${configHome}/GitHub Copilot/hosts.json`,
					`${configHome}/GitHub Copilot/apps.json`,
				]
			: [
					`${configHome}/github-copilot/hosts.json`,
					`${configHome}/github-copilot/apps.json`,
				];

	for (const path of copilotPaths) {
		if (await fileExists(path)) {
			return true;
		}
	}

	const envVars = ["GITHUB_TOKEN", "GH_TOKEN", "GITHUB_COPILOT_TOKEN"];
	for (const envVar of envVars) {
		if (process.env[envVar]) {
			return true;
		}
	}

	return false;
}

export async function detectProviders(): Promise<ProviderAvailability> {
	return { githubCopilot: await hasGitHubCopilot() };
}
