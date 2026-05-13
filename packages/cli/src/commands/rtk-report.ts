import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { option } from "../arguments";

interface RtkReportRow {
	kind: string;
	count: number;
	input: number;
	output: number;
	saved: number;
	pct: number | undefined;
	minutes: number;
}

interface RtkCommandRow extends RtkReportRow {
	command: string;
}

const RTK_DATABASE_PATH_PATTERN = /database_path\s*=\s*"([^"]+)"/;

export async function runRtkReportCommand(args: string[] = []): Promise<void> {
	const project = resolve(option(args, "--project") ?? process.cwd());
	const dbPath = option(args, "--db") ?? (await detectRtkHistoryDb());
	if (!dbPath) throw new Error("RTK history database not found");
	if (!existsSync(dbPath))
		throw new Error(`RTK history database missing: \`${dbPath}\``);
	const db = openDatabase(dbPath);
	try {
		const byKind = await queryRows<RtkReportRow>(
			db,
			dbPath,
			`select
				case
					when rtk_cmd like 'rtk fallback:%' then 'fallback'
					when rtk_cmd like 'rtk proxy%' then 'proxy'
					else 'filtered'
				end as kind,
				count(*) as count,
				coalesce(sum(input_tokens), 0) as input,
				coalesce(sum(output_tokens), 0) as output,
				coalesce(sum(saved_tokens), 0) as saved,
				100.0 * coalesce(sum(saved_tokens), 0) / nullif(coalesce(sum(input_tokens), 0), 0) as pct,
				coalesce(sum(exec_time_ms), 0) / 60000.0 as minutes
			from commands
			where project_path = ?
			group by kind
			order by output desc`,
			project,
		);
		const leaks = await queryRows<RtkCommandRow>(
			db,
			dbPath,
			`select
				substr(rtk_cmd, 1, 110) as command,
				case
					when rtk_cmd like 'rtk fallback:%' then 'fallback'
					when rtk_cmd like 'rtk proxy%' then 'proxy'
					else 'filtered'
				end as kind,
				count(*) as count,
				coalesce(sum(input_tokens), 0) as input,
				coalesce(sum(output_tokens), 0) as output,
				coalesce(sum(saved_tokens), 0) as saved,
				100.0 * coalesce(sum(saved_tokens), 0) / nullif(coalesce(sum(input_tokens), 0), 0) as pct,
				coalesce(sum(exec_time_ms), 0) / 60000.0 as minutes
			from commands
			where project_path = ?
			group by command, kind
			order by output desc, minutes desc
			limit 12`,
			project,
		);
		printReport(project, dbPath, byKind, leaks);
	} finally {
		db?.close();
	}
}

function openDatabase(dbPath: string): Database | undefined {
	try {
		return new Database(dbPath, { readonly: true });
	} catch {
		return undefined;
	}
}

async function queryRows<T>(
	db: Database | undefined,
	dbPath: string,
	sql: string,
	project: string,
): Promise<T[]> {
	if (db) {
		try {
			return db.query(sql).all(project) as T[];
		} catch {
			// Fall through to sqlite3 CLI for live RTK histories Bun cannot query.
		}
	}
	return await queryRowsWithSqliteCli<T>(dbPath, sql, project);
}

async function queryRowsWithSqliteCli<T>(
	dbPath: string,
	sql: string,
	project: string,
): Promise<T[]> {
	const proc = Bun.spawn(
		["sqlite3", "-json", dbPath, sql.replaceAll("?", quoteSql(project))],
		{ stdout: "pipe", stderr: "pipe" },
	);
	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	if (code !== 0)
		throw new Error(`\`sqlite3\` RTK query failed: \`${stderr}\``);
	return JSON.parse(stdout || "[]") as T[];
}

function quoteSql(value: string): string {
	return `'${value.replaceAll("'", "''")}'`;
}

async function detectRtkHistoryDb(): Promise<string | undefined> {
	const proc = Bun.spawn(["rtk", "config"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, code] = await Promise.all([
		new Response(proc.stdout).text(),
		proc.exited,
	]);
	if (code !== 0) return undefined;
	return stdout.match(RTK_DATABASE_PATH_PATTERN)?.[1];
}

function printReport(
	project: string,
	dbPath: string,
	byKind: RtkReportRow[],
	leaks: RtkCommandRow[],
): void {
	console.log("# RTK Project Efficiency Report");
	console.log(`project: ${project}`);
	console.log(`history: ${dbPath}`);
	console.log("");
	console.log("## By kind");
	for (const row of byKind)
		console.log(
			`${row.kind}: commands=${row.count} input=${row.input} output=${row.output} saved=${row.saved} pct=${formatPct(row.pct)} minutes=${row.minutes.toFixed(1)}`,
		);
	console.log("");
	console.log("## Top output leaks");
	for (const row of leaks)
		console.log(
			`${row.kind}: output=${row.output} saved=${row.saved} minutes=${row.minutes.toFixed(1)} count=${row.count} command=${row.command}`,
		);
	console.log("");
	console.log("## Rewrite candidates");
	console.log(
		"- `nl -ba <file>` -> `rtk read --line-numbers --max-lines <n> <file>`",
	);
	console.log(
		"- raw/proxy `grep` or `rg` -> `rtk grep <pattern> <path> -m <n> --file-type <type>`",
	);
	console.log(
		"- RTK search flag on raw `rg`/`grep` -> `rtk grep ... -m <n>` before any raw proxy fallback",
	);
	console.log(
		"- full `rtk read <file>` -> `rtk read --max-lines <n> <file>` or `rtk read --level minimal <file>`",
	);
	console.log(
		"- RTK read flag on shell `read` -> `rtk read --max-lines <n> <file>` or `rtk read --tail-lines <n> <file>`",
	);
	console.log(
		"- raw/proxy `dotnet build|test|format` -> `rtk dotnet build|test|format`",
	);
	console.log(
		"- no native RTK filter -> `rtk proxy -- <command>` only with bounded output",
	);
}

function formatPct(value: number | undefined): string {
	return typeof value === "number" ? `${value.toFixed(1)}%` : "n/a";
}
