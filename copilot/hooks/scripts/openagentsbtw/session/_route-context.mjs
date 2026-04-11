#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { loadRouteContracts } from "../_lib.mjs";

const ROUTE_MARKER_RE = /^OPENAGENTSBTW_([A-Z_]+)=(.+)$/gm;
const SKILL_COMMAND_RE = /^\/([a-z0-9-]+)\b/i;

function gitField(cwd, args, transform = (value) => value.trim()) {
	try {
		const result = spawnSync("git", ["-C", cwd, ...args], {
			encoding: "utf8",
			timeout: 1000,
		});
		if (result.status !== 0 || !result.stdout.trim()) return "";
		return transform(result.stdout);
	} catch {
		return "";
	}
}

export function getGitContext(cwd = process.cwd()) {
	const parts = [];
	const branch = gitField(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
	if (branch) parts.push(`Branch: ${branch}`);

	const log = gitField(cwd, ["log", "--oneline", "-5", "--no-decorate"]);
	if (log) parts.push(`Recent commits:\n${log}`);

	const diffStat = gitField(cwd, ["diff", "--stat", "--no-color", "HEAD"]);
	if (diffStat) parts.push(`Uncommitted changes:\n${diffStat}`);

	return parts.join("\n");
}

export function parseRouteMarkers(text = "") {
	const contract = {
		route: "",
		routeKind: "readonly",
		allowBlocked: true,
		allowDocsOnly: true,
		allowTestsOnly: true,
		rejectPrototypeScaffolding: false,
	};
	for (const match of text.matchAll(ROUTE_MARKER_RE)) {
		const key = match[1];
		const value = match[2].trim();
		switch (key) {
			case "ROUTE":
				contract.route = value;
				break;
			case "CONTRACT":
				contract.routeKind = value;
				break;
			case "ALLOW_BLOCKED":
				contract.allowBlocked = value === "true";
				break;
			case "ALLOW_DOCS_ONLY":
				contract.allowDocsOnly = value === "true";
				break;
			case "ALLOW_TESTS_ONLY":
				contract.allowTestsOnly = value === "true";
				break;
			case "REJECT_PROTOTYPE_SCAFFOLDING":
				contract.rejectPrototypeScaffolding = value === "true";
				break;
			default:
				break;
		}
	}
	return contract;
}

function formatContract(contract) {
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
	const inline = parseRouteMarkers(prompt);
	if (inline.route || inline.routeKind !== "readonly") {
		return inline;
	}
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
