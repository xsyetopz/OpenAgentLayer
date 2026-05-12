import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { option } from "../arguments";

interface UsageSummaryRow {
	week: string;
	source: string;
	model: string;
	reasoning_effort: string;
	threads: number;
	tokens: number;
	max_tokens: number;
}

interface TopThreadRow {
	tokens_used: number;
	model: string;
	reasoning_effort: string;
	thread_source: string;
	agent_role: string;
	cwd: string;
	title: string;
	rollout_path: string;
}

export function runCodexUsageCommand(args: string[] = []): void {
	const dbPath =
		option(args, "--db") ??
		join(resolve(option(args, "--home") ?? homedir()), ".codex/state_5.sqlite");
	const project = option(args, "--project");
	const limit = positiveInteger(option(args, "--limit"), 12);
	const json = args.includes("--json");
	if (!existsSync(dbPath))
		throw new Error(`Codex state database missing: \`${dbPath}\``);
	const db = new Database(dbPath, { readonly: true });
	try {
		const projectFilter = project ? "where cwd = $project" : "";
		const params = project
			? { $project: resolve(project), $limit: limit }
			: { $limit: limit };
		const summary = db
			.query(
				`select
					strftime('%Y-%W', created_at, 'unixepoch') as week,
					coalesce(thread_source, '') as source,
					coalesce(model, '') as model,
					coalesce(reasoning_effort, '') as reasoning_effort,
					count(*) as threads,
					coalesce(sum(tokens_used), 0) as tokens,
					coalesce(max(tokens_used), 0) as max_tokens
				from threads
				${projectFilter}
				group by week, source, model, reasoning_effort
				order by tokens desc
				limit $limit`,
			)
			.all(params) as UsageSummaryRow[];
		const topThreads = db
			.query(
				`select
					tokens_used,
					coalesce(model, '') as model,
					coalesce(reasoning_effort, '') as reasoning_effort,
					coalesce(thread_source, '') as thread_source,
					coalesce(agent_role, '') as agent_role,
					cwd,
					substr(title, 1, 120) as title,
					rollout_path
				from threads
				${projectFilter}
				order by tokens_used desc
				limit $limit`,
			)
			.all(params) as TopThreadRow[];
		if (json) {
			console.log(
				JSON.stringify({ dbPath, project, summary, topThreads }, null, 2),
			);
			return;
		}
		printUsageReport(dbPath, project, summary, topThreads);
	} finally {
		db.close();
	}
}

function positiveInteger(value: string | undefined, fallback: number): number {
	if (!value) return fallback;
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed) || parsed < 1)
		throw new Error(`Expected positive integer, got \`${value}\``);
	return parsed;
}

function printUsageReport(
	dbPath: string,
	project: string | undefined,
	summary: UsageSummaryRow[],
	topThreads: TopThreadRow[],
): void {
	console.log(`Codex usage database: ${dbPath}`);
	if (project) console.log(`Project: ${resolve(project)}`);
	console.log("\nWeekly usage by source/model:");
	if (summary.length === 0) console.log("- no rows");
	for (const row of summary)
		console.log(
			`- ${row.week} source=${row.source || "root"} model=${row.model || "unknown"} effort=${row.reasoning_effort || "none"} threads=${row.threads} tokens=${formatTokens(row.tokens)} max=${formatTokens(row.max_tokens)}`,
		);
	console.log("\nTop draining threads:");
	if (topThreads.length === 0) console.log("- no rows");
	for (const row of topThreads)
		console.log(
			`- ${formatTokens(row.tokens_used)} source=${row.thread_source || "root"} role=${row.agent_role || "none"} model=${row.model || "unknown"} effort=${row.reasoning_effort || "none"} cwd=${row.cwd}\n  title=${row.title}\n  rollout=${row.rollout_path}`,
		);
}

function formatTokens(value: number): string {
	if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
	return `${value}`;
}
