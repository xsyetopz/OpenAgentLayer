import { adapterFor } from "./adapters";
import type { DoctorResult } from "./adapters/types";
import { createOalError, type JsonObject, loadSource } from "./source";

const whitespacePattern = /\s+/;

export function doctorHooks(
	platform: string,
	root = process.cwd(),
): DoctorResult {
	const graph = loadSource(root);
	const adapter = adapterFor(platform);
	if (!adapter) {
		throw createOalError(
			"source/oal.json",
			"/platforms",
			"doctor hooks platform has no adapter",
			platform,
			"enabled platform with adapter",
		);
	}
	return adapter.doctorHooks(root, graph);
}

export function doctorTools(
	root = process.cwd(),
	options: { includeOptional?: boolean } = {},
): DoctorResult {
	const graph = loadSource(root);
	const checks = Object.entries(graph.tools.data["tools"] as JsonObject)
		.filter(
			([, tool]) =>
				options.includeOptional || (tool as JsonObject)["required"] === true,
		)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([id, tool]) => {
			const record = tool as JsonObject;
			const binaries = (
				(record["binaries"] as string[] | undefined) ?? [
					String(record["probe"]).split(whitespacePattern)[0],
				]
			).filter(Boolean);
			const foundBinary = binaries.find((binary) => Bun.which(binary));
			const required = record["required"] === true;
			return {
				message: `${id}: ${foundBinary ? `found ${foundBinary}` : `missing ${binaries.join("|")}`} (${required ? "required" : "optional"}; probe: ${record["probe"]})`,
				ok: Boolean(foundBinary) || !required,
				path: graph.tools.path,
			};
		});
	return {
		checks,
		ok: checks.every((check) => check.ok),
		platform: "tools",
	};
}

export function formatDoctorResult(result: DoctorResult): string {
	const doctorName =
		result.platform === "tools"
			? "tools doctor"
			: `${result.platform} hook doctor`;
	const lines = [
		`${result.ok ? "ok" : "fail"}: ${doctorName}`,
		...result.checks.map(
			(check) =>
				`${check.ok ? "ok" : "fail"}: ${check.path ?? result.platform}: ${check.message}`,
		),
	];
	return lines.join("\n");
}
