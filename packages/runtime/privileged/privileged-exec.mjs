#!/usr/bin/env node

import { spawn } from "node:child_process";
import { appendFileSync, readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";

const ALLOWED_COMMANDS = new Set([
	"xcodebuild",
	"xcrun",
	"security",
	"codesign",
]);
const DEFAULT_TIMEOUT_MS = 120_000;
const SHELL_METACHARACTER_PATTERN = /[;&|`$<>]/;

const raw = readFileSync(0, "utf8").trim();
let request;
try {
	request = JSON.parse(raw || "{}");
} catch (error) {
	fail("Malformed JSON request.", { error: String(error?.message ?? error) });
}

if (!Array.isArray(request.argv) || request.argv.length === 0)
	fail("argv must be a non-empty string array.");
if (
	!request.argv.every((value) => typeof value === "string" && value.length > 0)
)
	fail("argv must contain only non-empty strings.");

const command = request.argv[0];
if (!ALLOWED_COMMANDS.has(command))
	fail(`Command is not privileged-exec allowlisted: ${command}`);
if (request.argv.some((value) => SHELL_METACHARACTER_PATTERN.test(value))) {
	fail("Shell metacharacters are not allowed in argv values.");
}

const cwd = String(request.cwd ?? process.cwd());
const allowedRoot = String(request.allowedRoot ?? process.cwd());
if (!isInside(cwd, allowedRoot))
	fail("cwd is outside allowedRoot.", { cwd, allowedRoot });

const timeoutMs = Number(request.timeoutMs ?? DEFAULT_TIMEOUT_MS);
if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 600_000)
	fail("timeoutMs must be between 1 and 600000.");

if (request.dryRun === true) {
	succeed({ dryRun: true, argv: request.argv, cwd });
}

const child = spawn(command, request.argv.slice(1), {
	cwd,
	stdio: ["ignore", "pipe", "pipe"],
});
const timer = setTimeout(() => {
	child.kill("SIGTERM");
}, timeoutMs);

const stdout = [];
const stderr = [];
child.stdout.on("data", (chunk) => stdout.push(chunk));
child.stderr.on("data", (chunk) => stderr.push(chunk));
child.on("close", (code, signal) => {
	clearTimeout(timer);
	succeed({
		code,
		signal,
		stdout: Buffer.concat(stdout).toString("utf8"),
		stderr: Buffer.concat(stderr).toString("utf8"),
	});
});

function isInside(candidate, root) {
	const realCandidate = realpathSync(resolve(candidate));
	const realRoot = realpathSync(resolve(root));
	return realCandidate === realRoot || realCandidate.startsWith(`${realRoot}/`);
}

function succeed(result) {
	audit("pass", result);
	process.stdout.write(`${JSON.stringify({ ok: true, ...result })}\n`);
	process.exit(0);
}

function fail(message, details = {}) {
	audit("block", { message, ...details });
	process.stdout.write(
		`${JSON.stringify({ ok: false, error: message, ...details })}\n`,
	);
	process.exit(2);
}

function audit(decision, payload) {
	const auditPath = process.env.OAL_PRIVILEGED_EXEC_AUDIT;
	if (!auditPath) return;
	appendFileSync(
		auditPath,
		`${JSON.stringify({ ts: new Date().toISOString(), decision, payload })}\n`,
	);
}
