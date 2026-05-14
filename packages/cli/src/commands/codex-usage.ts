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

interface UsageVerdict {
	plan?: string;
	reset: string;
	nextReset: string;
	elapsedPercent: number;
	usedPercent?: number;
	pacing: "reserve" | "deficit" | "on-pace";
	pacingPercent?: number;
	totalTokens: number;
	runOutRisk?: string;
}

export function runCodexUsageCommand(args: string[] = []): void {
	const dbPath =
		option(args, "--db") ??
		join(resolve(option(args, "--home") ?? homedir()), ".codex/state_5.sqlite");
	const project = option(args, "--project");
	const limit = positiveInteger(option(args, "--limit"), 12);
	const reset = optionalTimestamp(option(args, "--reset"), "--reset");
	const nextReset = optionalTimestamp(
		option(args, "--next-reset"),
		"--next-reset",
	);
	const plan = option(args, "--plan");
	const weeklyLimitTokens = optionalPositiveInteger(
		option(args, "--weekly-limit-tokens"),
		"--weekly-limit-tokens",
	);
	const weeklyUsedPercent = optionalPercent(
		option(args, "--weekly-used-percent"),
		"--weekly-used-percent",
	);
	const failAtDeficitPercent = optionalPercent(
		option(args, "--fail-at-deficit-percent"),
		"--fail-at-deficit-percent",
	);
	const json = args.includes("--json");
	if (!existsSync(dbPath))
		throw new Error(`Codex state database missing: \`${dbPath}\``);
	const db = new Database(dbPath, { readonly: true });
	try {
		if ((reset && !nextReset) || (!reset && nextReset))
			throw new Error("Expected both `--reset` and `--next-reset`");
		const projectClause = project ? ["cwd = $project"] : [];
		const windowClause =
			reset && nextReset
				? ["updated_at >= $reset", "updated_at < $nextReset"]
				: [];
		const whereClause = [...projectClause, ...windowClause];
		const filter =
			whereClause.length > 0 ? `where ${whereClause.join(" and ")}` : "";
		const params = {
			...(project ? { $project: resolve(project) } : {}),
			...(reset && nextReset
				? { $reset: reset.unixSeconds, $nextReset: nextReset.unixSeconds }
				: {}),
			$limit: limit,
		};
		const summary = db
			.query(
				`select
					strftime('%Y-%W', ${reset ? "updated_at" : "created_at"}, 'unixepoch') as week,
					coalesce(thread_source, '') as source,
					coalesce(model, '') as model,
					coalesce(reasoning_effort, '') as reasoning_effort,
					count(*) as threads,
					coalesce(sum(tokens_used), 0) as tokens,
					coalesce(max(tokens_used), 0) as max_tokens
				from threads
				${filter}
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
				${filter}
				order by tokens_used desc
				limit $limit`,
			)
			.all(params) as TopThreadRow[];
		const totalTokens =
			(
				db
					.query(
						`select coalesce(sum(tokens_used), 0) as tokens from threads ${filter}`,
					)
					.get(params) as { tokens: number }
			).tokens ?? 0;
		const verdict =
			reset && nextReset
				? usageVerdict({
						plan,
						reset,
						nextReset,
						totalTokens,
						weeklyLimitTokens,
						weeklyUsedPercent,
					})
				: undefined;
		if (json) {
			console.log(
				JSON.stringify(
					{ dbPath, project, plan, verdict, summary, topThreads },
					null,
					2,
				),
			);
			applyDeficitExitCode(verdict, failAtDeficitPercent);
			return;
		}
		printUsageReport(dbPath, project, summary, topThreads, verdict);
		applyDeficitExitCode(verdict, failAtDeficitPercent);
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

function optionalPositiveInteger(
	value: string | undefined,
	name: string,
): number | undefined {
	if (!value) return undefined;
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed) || parsed < 1)
		throw new Error(
			`Expected ${name} to be a positive integer, got \`${value}\``,
		);
	return parsed;
}

function optionalPercent(
	value: string | undefined,
	name: string,
): number | undefined {
	if (!value) return undefined;
	const parsed = Number.parseFloat(value);
	if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100)
		throw new Error(
			`Expected ${name} to be a percent from 0 to 100, got \`${value}\``,
		);
	return parsed;
}

function optionalTimestamp(
	value: string | undefined,
	name: string,
): { text: string; unixSeconds: number } | undefined {
	if (!value) return undefined;
	const ms = Date.parse(value);
	if (!Number.isFinite(ms))
		throw new Error(
			`Expected ${name} to be a parseable date, got \`${value}\``,
		);
	return { text: value, unixSeconds: Math.floor(ms / 1000) };
}

function printUsageReport(
	dbPath: string,
	project: string | undefined,
	summary: UsageSummaryRow[],
	topThreads: TopThreadRow[],
	verdict?: UsageVerdict,
): void {
	console.log(`Codex usage database: ${dbPath}`);
	if (project) console.log(`Project: ${resolve(project)}`);
	if (verdict) {
		console.log("\nReset-window pacing:");
		console.log(
			`- reset=${verdict.reset} next=${verdict.nextReset} elapsed=${verdict.elapsedPercent.toFixed(1)}% tokens=${formatTokens(verdict.totalTokens)}`,
		);
		if (typeof verdict.usedPercent === "number")
			console.log(
				`- ${verdict.usedPercent.toFixed(1)}% used; ${verdict.pacingPercent?.toFixed(1)}% in ${verdict.pacing}; run-out risk=${verdict.runOutRisk}`,
			);
		else
			console.log(
				"- pass --weekly-limit-tokens or --weekly-used-percent for reserve/deficit verdict",
			);
	}
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

function usageVerdict(input: {
	plan?: string;
	reset: { text: string; unixSeconds: number };
	nextReset: { text: string; unixSeconds: number };
	totalTokens: number;
	weeklyLimitTokens?: number;
	weeklyUsedPercent?: number;
}): UsageVerdict {
	const now = Date.now() / 1000;
	const elapsedPercent = clampPercent(
		((now - input.reset.unixSeconds) /
			(input.nextReset.unixSeconds - input.reset.unixSeconds)) *
			100,
	);
	const usedPercent =
		input.weeklyUsedPercent ??
		(input.weeklyLimitTokens
			? (input.totalTokens / input.weeklyLimitTokens) * 100
			: undefined);
	if (typeof usedPercent !== "number")
		return {
			plan: input.plan,
			reset: input.reset.text,
			nextReset: input.nextReset.text,
			elapsedPercent,
			totalTokens: input.totalTokens,
			pacing: "on-pace",
		};
	const delta = usedPercent - elapsedPercent;
	const pacing =
		Math.abs(delta) < 0.1 ? "on-pace" : delta > 0 ? "deficit" : "reserve";
	const runOutRisk =
		usedPercent >= 100
			? "exhausted"
			: usedPercent > elapsedPercent
				? "elevated"
				: "low";
	return {
		plan: input.plan,
		reset: input.reset.text,
		nextReset: input.nextReset.text,
		elapsedPercent,
		usedPercent,
		pacing,
		pacingPercent: Math.abs(delta),
		totalTokens: input.totalTokens,
		runOutRisk,
	};
}

function clampPercent(value: number): number {
	return Math.max(0, Math.min(100, value));
}

function applyDeficitExitCode(
	verdict: UsageVerdict | undefined,
	failAtDeficitPercent: number | undefined,
): void {
	if (
		verdict?.pacing === "deficit" &&
		typeof verdict.pacingPercent === "number" &&
		typeof failAtDeficitPercent === "number" &&
		verdict.pacingPercent >= failAtDeficitPercent
	)
		process.exitCode = 1;
}

function formatTokens(value: number): string {
	if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
	return `${value}`;
}
