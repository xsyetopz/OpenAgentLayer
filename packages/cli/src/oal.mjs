#!/usr/bin/env node
import { inspect } from "node:util";
import { loadAdapters } from "../../core/src/adapters.mjs";
import { loadProduct } from "../../core/src/product.mjs";
import { planInstall, planUninstall } from "../../installer/src/index.mjs";
import { renderArtifacts, renderSummary } from "../../renderers/src/index.mjs";
import {
	formatResults,
	runChecks,
	summarizeResults,
} from "../../validation/src/checks.mjs";

function parseArgs(argv) {
	const args = { _: [] };
	for (let index = 0; index < argv.length; index += 1) {
		const value = argv[index];
		if (!value.startsWith("--")) {
			args._.push(value);
			continue;
		}
		const key = value.slice(2);
		const next = argv[index + 1];
		if (!next || next.startsWith("--")) {
			args[key] = true;
		} else {
			args[key] = next;
			index += 1;
		}
	}
	return args;
}

function writeJson(value) {
	process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function writeText(value) {
	process.stdout.write(`${value}\n`);
}

async function commandPlan(args) {
	const product = await loadProduct();
	const adapters = await loadAdapters();
	const value = {
		adapters: adapters.length,
		cli: product.cli,
		product: product.name,
		runner: product.runner,
	};
	args.json
		? writeJson(value)
		: writeText(
				`${value.product} (${value.cli})\nadapters\t${value.adapters}\nrunner\t${value.runner}`,
			);
}

async function commandCheck(args) {
	const target = args._[1] ?? args.target ?? "all";
	const results = await runChecks(target);
	const summary = summarizeResults(results);
	if (args.json) {
		writeJson({ results, summary });
	} else {
		writeText(formatResults(results));
	}
	if (!summary.ok) {
		process.exitCode = 1;
	}
}

async function commandRender(args) {
	const artifacts = await renderArtifacts(args.platform ?? "all");
	if (args.json) {
		writeJson({ artifacts });
	} else {
		writeText(renderSummary(artifacts));
	}
}

async function commandInstall(args) {
	const plan = await planInstall({
		dryRun: args["dry-run"] !== false,
		home: args.home,
		platform: args.platform,
		project: args.project,
	});
	args.json
		? writeJson(plan)
		: writeText(inspect(plan, { colors: false, depth: null }));
}

function commandUninstall(args) {
	const plan = planUninstall({
		all: args.all === true,
		dryRun: args["dry-run"] !== false,
		home: args.home,
		project: args.project,
	});
	args.json
		? writeJson(plan)
		: writeText(inspect(plan, { colors: false, depth: null }));
}

async function commandDoctor(args) {
	const results = await runChecks("all");
	const summary = summarizeResults(results);
	const doctor = {
		checks: summary.passed + summary.failed,
		failed: summary.failed,
		ok: summary.ok,
	};
	args.json
		? writeJson(doctor)
		: writeText(
				`oal doctor\t${doctor.ok ? "ok" : "fail"}\nchecks\t${doctor.checks}\nfailed\t${doctor.failed}`,
			);
	if (!summary.ok) {
		process.exitCode = 1;
	}
}

function usage() {
	return "Usage: oal <plan|render|install|uninstall|check|validate|doctor> [--json] [--platform id] [--dry-run]";
}

const commands = {
	check: commandCheck,
	doctor: commandDoctor,
	install: commandInstall,
	plan: commandPlan,
	render: commandRender,
	uninstall: commandUninstall,
	validate: commandCheck,
};

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const command = args._[0] ?? "plan";
	const handler = commands[command];
	if (!handler) {
		writeText(usage());
		process.exitCode = 1;
		return;
	}
	await handler(args);
}

main().catch((error) => {
	process.stderr.write(`${error.message}\n`);
	process.exitCode = 1;
});
