import {
	assertProfileName,
	buildProfileFromArgs,
	configPathFromArgs,
	loadConfig,
	type OalConfig,
	type OalProfile,
	saveConfig,
	setupArgsForProfile,
} from "../config-state";

export async function runProfilesCommand(args: string[]): Promise<void> {
	const action = args[0] ?? "list";
	const rest = args.slice(1);
	const configPath = configPathFromArgs(rest);
	const config = await loadConfig(configPath);
	if (action === "list") {
		printProfiles(config, configPath);
		return;
	}
	if (action === "show") {
		printProfile(config, rest[0] ?? config.activeProfile, configPath);
		return;
	}
	if (action === "save") {
		const name = rest[0];
		if (!name) throw new Error("Profile name is required");
		assertProfileName(name);
		config.profiles[name] = buildProfileFromArgs(rest.slice(1));
		if (rest.includes("--activate")) config.activeProfile = name;
		await saveConfig(configPath, config);
		console.log(`Saved profile \`${name}\``);
		return;
	}
	if (action === "use") {
		const name = rest[0];
		if (!name) throw new Error("Profile name is required");
		assertProfileName(name);
		if (!config.profiles[name])
			throw new Error(`Profile \`${name}\` is available to save first`);
		config.activeProfile = name;
		await saveConfig(configPath, config);
		console.log(`Active profile \`${name}\``);
		return;
	}
	if (action === "remove") {
		const name = rest[0];
		if (!name) throw new Error("Profile name is required");
		assertProfileName(name);
		if (!config.profiles[name])
			throw new Error(`Profile \`${name}\` is already absent`);
		delete config.profiles[name];
		if (config.activeProfile === name) delete config.activeProfile;
		await saveConfig(configPath, config);
		console.log(`Removed profile \`${name}\``);
		return;
	}
	if (action === "args") {
		const name = rest[0] ?? config.activeProfile;
		const profile = name ? config.profiles[name] : undefined;
		if (!(name && profile))
			throw new Error("Profile is available to select with `profiles use`");
		console.log(setupArgsForProfile(profile).join(" "));
		return;
	}
	throw new Error(
		`Profile action \`${action}\` uses list, show, save, use, remove, or args`,
	);
}

function printProfiles(config: OalConfig, configPath: string): void {
	console.log("OpenAgentLayer profiles");
	console.log(`config: ${configPath}`);
	console.log(`active: ${config.activeProfile ?? "none"}`);
	for (const [name, profile] of Object.entries(config.profiles))
		console.log(`- ${name}: ${profileSummary(profile)}`);
}

function printProfile(
	config: OalConfig,
	name: string | undefined,
	configPath: string,
): void {
	if (!name)
		throw new Error("Profile is available to select with `profiles use`");
	assertProfileName(name);
	const profile = config.profiles[name];
	if (!profile)
		throw new Error(`Profile \`${name}\` is available to save first`);
	console.log("OpenAgentLayer profile");
	console.log(`config: ${configPath}`);
	console.log(`name: ${name}`);
	console.log(`active: ${config.activeProfile === name ? "yes" : "no"}`);
	console.log(JSON.stringify(profile, undefined, 2));
}

function profileSummary(profile: OalProfile): string {
	const parts = [
		`scope=${profile.scope}`,
		`providers=${profile.providers.join(",")}`,
	];
	if (profile.codexPlan) parts.push(`codex=${profile.codexPlan}`);
	if (profile.claudePlan) parts.push(`claude=${profile.claudePlan}`);
	if (profile.opencodePlan) parts.push(`opencode=${profile.opencodePlan}`);
	if (profile.optionalTools && profile.optionalTools.length > 0)
		parts.push(`optional=${profile.optionalTools.join(",")}`);
	return parts.join(" ");
}
