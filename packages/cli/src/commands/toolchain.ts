import {
	isExpectedContext7ApiKey,
	OFFICIAL_SKILL_CATALOG,
	OFFICIAL_SKILL_CATEGORIES,
	type OfficialSkillCatalogEntry,
	type OfficialSkillCategory,
	type OperatingSystem,
	type OptionalTool,
	officialSkillBundleLinks,
	officialSkillCategoryMap,
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
		const catalog = filterOfficialSkillCatalog(
			await fetchOfficialSkillCatalog(catalogUrl),
			option(args, "--category"),
		);
		const install = catalogOptionalTools(option(args, "--install"), catalog);
		const remove = catalogOptionalTools(option(args, "--remove"), catalog);
		if (install.length > 0 || remove.length > 0) {
			const commands = [
				...optionalFeatureCommands("install", install, {
					officialSkills: catalog,
				}),
				...optionalFeatureCommands("remove", remove, {
					officialSkills: catalog,
				}),
			];
			console.log(
				renderFeatureCommands([...install, ...remove], commands, catalog),
			);
			return;
		}
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
			`Expected \`--install\` or \`--remove\` with \`ctx7,deepwiki,playwright,${officialSkillIds().join(",")}\``,
		);
	const commands = [
		...optionalFeatureCommands("install", install, {
			...(context7ApiKey ? { context7ApiKey } : {}),
		}),
		...optionalFeatureCommands("remove", remove),
	];
	console.log(renderFeatureCommands([...install, ...remove], commands));
}

function assertOfficialSkillsUrl(url: string): void {
	const parsed = new URL(url);
	if (parsed.protocol !== "https:" || parsed.hostname !== "officialskills.sh")
		throw new Error("`--catalog-url` must use https://officialskills.sh/");
}

export async function fetchOfficialSkillCatalog(
	url: string,
	options: { signal?: AbortSignal; timeoutMs?: number } = {},
) {
	const controller =
		options.signal || options.timeoutMs === undefined
			? undefined
			: new AbortController();
	const timeout = controller
		? setTimeout(() => controller.abort(), options.timeoutMs)
		: undefined;
	const signal = options.signal ?? controller?.signal;
	try {
		return await fetchOfficialSkillCatalogInner(url, signal);
	} finally {
		if (timeout) clearTimeout(timeout);
	}
}

async function fetchOfficialSkillCatalogInner(
	url: string,
	signal: AbortSignal | undefined,
) {
	const response = await fetchWithSignal(url, signal);
	if (!response.ok)
		throw new Error(
			`Failed to fetch officialskills catalog: ${response.status}`,
		);
	const html = await response.text();
	const direct = parseOfficialSkillPage(html, url);
	if (direct) return [direct];
	const categoryMap = await fetchOfficialSkillCategories(html, url, signal);
	const entries: OfficialSkillCatalogEntry[] = [];
	for (const link of officialSkillLinks(html)) {
		const page = await fetchWithSignal(link, signal);
		if (!page.ok) continue;
		const entry = parseOfficialSkillPage(await page.text(), link);
		if (entry) {
			const [owner, , skill] = new URL(link).pathname
				.split("/")
				.filter(Boolean);
			const slug = [owner, skill].filter(Boolean).join("/");
			entries.push({
				...entry,
				category: categoryMap.get(slug) ?? entry.category,
			});
		}
	}
	return entries;
}

async function fetchOfficialSkillCategories(
	html: string,
	sourceUrl: string,
	signal: AbortSignal | undefined,
): Promise<Map<string, OfficialSkillCategory>> {
	const categories = new Map<string, OfficialSkillCategory>();
	for (const link of officialSkillBundleLinks(html, sourceUrl)) {
		const response = await fetchWithSignal(link, signal);
		if (!response.ok) continue;
		for (const [slug, category] of officialSkillCategoryMap(
			await response.text(),
		))
			categories.set(slug, category);
	}
	return categories;
}

function fetchWithSignal(url: string, signal: AbortSignal | undefined) {
	return signal ? fetch(url, { signal }) : fetch(url);
}

function filterOfficialSkillCatalog(
	catalog: OfficialSkillCatalogEntry[],
	category: string | undefined,
): OfficialSkillCatalogEntry[] {
	if (!category || category === "all") return catalog;
	if (!OFFICIAL_SKILL_CATEGORIES.includes(category as OfficialSkillCategory))
		throw new Error(
			"`--category` must be one of all,infrastructure,development,ai-tools,ai-agents,workflows,security,data,design,docs,testing",
		);
	return catalog.filter((entry) => entry.category === category);
}

function renderFeatureCommands(
	features: readonly OptionalTool[],
	commands: readonly string[],
	catalog: readonly OfficialSkillCatalogEntry[] = [],
): string {
	return [
		"# OpenAgentLayer Optional Feature Commands",
		`Features: ${features.map((feature) => featureLabel(feature, catalog)).join(", ")}`,
		"",
		"```bash",
		...commands,
		"```",
		"",
	].join("\n");
}

function featureLabel(
	feature: OptionalTool,
	catalog: readonly OfficialSkillCatalogEntry[],
): string {
	const entry = catalog.find((candidate) => candidate.id === feature);
	if (entry) return `${entry.publisher} ${entry.name} [skill]`;
	return optionalToolLabel(feature);
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

function catalogOptionalTools(
	rawTools: string | undefined,
	catalog: readonly OfficialSkillCatalogEntry[],
): OptionalTool[] {
	if (!rawTools) return [];
	const catalogIds = new Set(catalog.map((entry) => entry.id));
	return rawTools
		.split(",")
		.map((tool) => tool.trim())
		.flatMap((tool) =>
			tool === "all" ? catalog.map((entry) => entry.id) : tool,
		)
		.filter((tool): tool is OptionalTool => catalogIds.has(tool));
}
