import {
	isExpectedContext7ApiKey,
	OFFICIAL_SKILL_CATALOG,
	type OfficialSkillCatalogEntry,
	type OperatingSystem,
	type OptionalTool,
	officialSkillIds,
	officialSkillLinks,
	optionalFeatureCommands,
	optionalToolLabel,
	type PackageManager,
	parseOfficialSkillPage,
	planToolchainInstall,
	renderToolchainPlan,
} from "@openagentlayer/toolchain";
import { option } from "../arguments";

export function runToolchainCommand(args: string[]): void {
	const os = osOption(option(args, "--os"));
	const packageManager = option(args, "--pkg") as PackageManager | undefined;
	const includeOptional = optionalTools(option(args, "--optional"));
	const context7ApiKey = option(args, "--context7-api-key");
	if (context7ApiKey && !isExpectedContext7ApiKey(context7ApiKey))
		throw new Error("Context7 API key must start with ctx7sk-");
	const baseOptions = {
		os,
		hasHomebrew: !args.includes("--homebrew-missing"),
		includeOptional,
		...(context7ApiKey ? { context7ApiKey } : {}),
	};
	const plan = planToolchainInstall(
		packageManager ? { ...baseOptions, packageManager } : baseOptions,
	);
	if (args.includes("--json")) console.log(JSON.stringify(plan, undefined, 2));
	else console.log(renderToolchainPlan(plan));
}

export async function runFeaturesCommand(args: string[]): Promise<void> {
	const catalogUrl = option(args, "--catalog-url");
	if (catalogUrl) {
		assertOfficialSkillsUrl(catalogUrl);
		const catalog = await fetchOfficialSkillCatalog(catalogUrl);
		if (args.includes("--json"))
			console.log(JSON.stringify(catalog, undefined, 2));
		else console.log(renderOfficialSkillCatalog(catalog));
		return;
	}
	if (args.includes("--catalog")) {
		if (args.includes("--json"))
			console.log(JSON.stringify(OFFICIAL_SKILL_CATALOG, undefined, 2));
		else console.log(renderOfficialSkillCatalog(OFFICIAL_SKILL_CATALOG));
		return;
	}
	const install = optionalTools(option(args, "--install"));
	const remove = optionalTools(option(args, "--remove"));
	const context7ApiKey = option(args, "--context7-api-key");
	if (context7ApiKey && !isExpectedContext7ApiKey(context7ApiKey))
		throw new Error("Context7 API key must start with ctx7sk-");
	if (install.length === 0 && remove.length === 0)
		throw new Error(
			"Expected `--install` or `--remove` with `ctx7,deepwiki,playwright,skill-frontend-design,skill-webapp-testing,skill-security-best-practices,skill-react-best-practices,skill-stripe-best-practices,skill-workers-best-practices`",
		);
	const commands = [
		...optionalFeatureCommands("install", install, {
			...(context7ApiKey ? { context7ApiKey } : {}),
		}),
		...optionalFeatureCommands("remove", remove),
	];
	console.log(
		[
			"# OpenAgentLayer Optional Feature Commands",
			`Features: ${[...install, ...remove].map(optionalToolLabel).join(", ")}`,
			"",
			"```bash",
			...commands,
			"```",
			"",
		].join("\n"),
	);
}

function assertOfficialSkillsUrl(url: string): void {
	const parsed = new URL(url);
	if (parsed.protocol !== "https:" || parsed.hostname !== "officialskills.sh")
		throw new Error("`--catalog-url` must use https://officialskills.sh/");
}

async function fetchOfficialSkillCatalog(url: string) {
	const response = await fetch(url);
	if (!response.ok)
		throw new Error(
			`Failed to fetch officialskills catalog: ${response.status}`,
		);
	const html = await response.text();
	const direct = parseOfficialSkillPage(html, url);
	if (direct) return [direct];
	const entries: OfficialSkillCatalogEntry[] = [];
	for (const link of officialSkillLinks(html).slice(0, 25)) {
		const page = await fetch(link);
		if (!page.ok) continue;
		const entry = parseOfficialSkillPage(await page.text(), link);
		if (entry) entries.push(entry);
	}
	return entries;
}

function renderOfficialSkillCatalog(
	catalog: readonly OfficialSkillCatalogEntry[],
): string {
	return [
		"# OpenAgentLayer Official Skills Catalog",
		"",
		...catalog.map((entry) =>
			[
				`## ${entry.publisher}/${entry.name}`,
				`id: ${entry.id}`,
				`category: ${entry.category}`,
				`source status: ${entry.sourceStatus}`,
				`install: bunx skills add ${entry.repo} --skill ${entry.skill}`,
				`source: ${entry.sourceUrl}`,
				entry.description,
				"",
			].join("\n"),
		),
	].join("\n");
}

function osOption(rawOs: string | undefined): OperatingSystem {
	if (rawOs === "macos" || rawOs === "linux") return rawOs;
	if (!rawOs) return process.platform === "darwin" ? "macos" : "linux";
	throw new Error(
		`Unsupported OS \`${rawOs}\`. Expected \`macos\` or \`linux\`.`,
	);
}

function optionalTools(rawTools: string | undefined): OptionalTool[] {
	if (!rawTools) return [];
	return rawTools
		.split(",")
		.map((tool) => tool.trim())
		.filter((tool): tool is OptionalTool =>
			["ctx7", "deepwiki", "playwright", ...officialSkillIds()].includes(tool),
		);
}
