import { spawnSync } from "node:child_process";
import { loadRouteContracts } from "../_lib.mjs";

const SKILL_COMMAND_RE = /^\/cca:([a-z0-9-]+)\b/i;

function gitField(args, transform = (value) => value.trim()) {
	try {
		const result = spawnSync("git", args, {
			encoding: "utf8",
			timeout: 1000,
		});
		if (result.status !== 0 || !result.stdout.trim()) return "";
		return transform(result.stdout);
	} catch {
		return "";
	}
}

export function getGitContext() {
	const parts = [];
	const branch = gitField(["rev-parse", "--abbrev-ref", "HEAD"]);
	if (branch) {
		parts.push(`Branch: ${branch}`);
	}

	const log = gitField(["log", "--oneline", "-5", "--no-decorate"]);
	if (log) {
		parts.push(`Recent commits:\n${log}`);
	}

	const diffStat = gitField(["diff", "--stat", "--no-color", "HEAD"]);
	if (diffStat) {
		parts.push(`Uncommitted changes:\n${diffStat}`);
	}

	return parts.join("\n");
}

function formatContract(contract) {
	if (!contract) return "";
	return [
		`OPENAGENTSBTW_ROUTE=${contract.route}`,
		`OPENAGENTSBTW_CONTRACT=${contract.routeKind}`,
		`OPENAGENTSBTW_ALLOW_BLOCKED=${String(contract.allowBlocked)}`,
		`OPENAGENTSBTW_ALLOW_DOCS_ONLY=${String(contract.allowDocsOnly)}`,
		`OPENAGENTSBTW_ALLOW_TESTS_ONLY=${String(contract.allowTestsOnly)}`,
		`OPENAGENTSBTW_REJECT_PROTOTYPE_SCAFFOLDING=${String(contract.rejectPrototypeScaffolding)}`,
	].join("\n");
}

export function resolveSkillRoute(prompt = "") {
	const match = prompt.trim().match(SKILL_COMMAND_RE);
	if (!match) return null;
	const contracts = loadRouteContracts();
	return contracts.skills?.[match[1]] ?? null;
}

export function resolveAgentRoute(agentType = "") {
	const contracts = loadRouteContracts();
	return contracts.agents?.[agentType] ?? null;
}

export function buildRouteContext(contract, extraSections = []) {
	const sections = [
		...(contract ? [formatContract(contract)] : []),
		...extraSections.filter(Boolean),
	];
	return sections.filter(Boolean).join("\n\n");
}
