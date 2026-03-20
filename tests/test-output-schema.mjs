import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
	allow,
	deny,
	genericBlock,
	genericWarn,
	postWarn,
	stopBlock,
	stopWarn,
	warn,
} from "../hooks/scripts/_lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(
	__dirname,
	"..",
	"hooks",
	"schema",
	"hook-output.json",
);

let Ajv;
try {
	Ajv = (await import("ajv/dist/2020.js")).default;
} catch {
	try {
		Ajv = (await import("ajv")).default;
	} catch {
		// ajv not installed; schema validation tests will be skipped
	}
}

function captureExit(fn, ...args) {
	let captured = "";
	const origWrite = process.stdout.write.bind(process.stdout);
	const origExit = process.exit.bind(process);

	process.stdout.write = (chunk) => {
		captured += chunk;
		return true;
	};
	process.exit = () => {
		throw new Error("__exit__");
	};

	try {
		fn(...args);
	} catch (err) {
		if (!err.message.includes("__exit__")) throw err;
	} finally {
		process.stdout.write = origWrite;
		process.exit = origExit;
	}

	return JSON.parse(captured.trim());
}

function loadSchema() {
	return JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
}

describe("PostWarn", () => {
	it("should have correct output structure", () => {
		const output = captureExit(postWarn, "test message");
		assert.equal(output.hookSpecificOutput.hookEventName, "PostToolUse");
		assert.equal(output.hookSpecificOutput.additionalContext, "test message");
	});

	it("should have no extra fields", () => {
		const output = captureExit(postWarn, "msg");
		const keys = Object.keys(output.hookSpecificOutput);
		assert.deepEqual(
			new Set(keys),
			new Set(["hookEventName", "additionalContext"]),
		);
	});

	it("should validate against schema", { skip: !Ajv }, () => {
		const ajv = new Ajv();
		const validate = ajv.compile(loadSchema());
		const output = captureExit(postWarn, "test");
		assert.ok(validate(output), JSON.stringify(validate.errors));
	});
});

describe("GenericWarn", () => {
	it("should have correct output structure", () => {
		const output = captureExit(genericWarn, "warning text");
		assert.equal(output.hookSpecificOutput.hookEventName, "PostToolUse");
		assert.equal(output.hookSpecificOutput.additionalContext, "warning text");
	});

	it("should validate against schema", { skip: !Ajv }, () => {
		const ajv = new Ajv();
		const validate = ajv.compile(loadSchema());
		const output = captureExit(genericWarn, "test");
		assert.ok(validate(output), JSON.stringify(validate.errors));
	});
});

describe("GenericBlock", () => {
	it("should have correct output structure", () => {
		const output = captureExit(genericBlock, "blocked");
		assert.equal(output.hookSpecificOutput.hookEventName, "PreToolUse");
		assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
		assert.equal(output.hookSpecificOutput.permissionDecisionReason, "blocked");
	});

	it("should validate against schema", { skip: !Ajv }, () => {
		const ajv = new Ajv();
		const validate = ajv.compile(loadSchema());
		const output = captureExit(genericBlock, "test");
		assert.ok(validate(output), JSON.stringify(validate.errors));
	});
});

describe("Deny", () => {
	it("should produce PreToolUse output", () => {
		const output = captureExit(deny, "reason");
		const hso = output.hookSpecificOutput;
		assert.equal(hso.hookEventName, "PreToolUse");
		assert.equal(hso.permissionDecision, "deny");
		assert.equal(hso.permissionDecisionReason, "reason");
	});

	it("should validate against schema", { skip: !Ajv }, () => {
		const ajv = new Ajv();
		const validate = ajv.compile(loadSchema());
		const output = captureExit(deny, "reason");
		assert.ok(validate(output), JSON.stringify(validate.errors));
	});
});

describe("Warn", () => {
	it("should default to PostToolUse event", () => {
		const output = captureExit(warn, "msg");
		assert.equal(output.hookSpecificOutput.hookEventName, "PostToolUse");
	});

	it("should validate against schema", { skip: !Ajv }, () => {
		const ajv = new Ajv();
		const validate = ajv.compile(loadSchema());
		const output = captureExit(warn, "msg");
		assert.ok(validate(output), JSON.stringify(validate.errors));
	});
});

describe("Allow", () => {
	it("should have correct output structure", () => {
		const output = captureExit(allow, "allowed");
		const hso = output.hookSpecificOutput;
		assert.equal(hso.hookEventName, "PreToolUse");
		assert.equal(hso.permissionDecision, "allow");
	});

	it("should validate against schema", { skip: !Ajv }, () => {
		const ajv = new Ajv();
		const validate = ajv.compile(loadSchema());
		const output = captureExit(allow, "allowed");
		assert.ok(validate(output), JSON.stringify(validate.errors));
	});
});

describe("StopWarn", () => {
	it("should write JSON to stdout with decision warn", () => {
		let captured = "";
		let exitCalled = false;
		const origWrite = process.stdout.write.bind(process.stdout);
		const origExit = process.exit;
		process.stdout.write = (chunk) => {
			captured += chunk;
			return true;
		};
		process.exit = () => {
			exitCalled = true;
			throw new Error("__exit__");
		};
		try {
			stopWarn("stale session");
		} catch (err) {
			if (!err.message.includes("__exit__")) throw err;
		} finally {
			process.stdout.write = origWrite;
			process.exit = origExit;
		}
		assert.ok(exitCalled, "stopWarn must call process.exit");
		const parsed = JSON.parse(captured.trim());
		assert.strictEqual(parsed.decision, "warn");
		assert.ok(parsed.reason.includes("stale session"));
	});
});

describe("StopBlock", () => {
	it("should exit with code 2 and write flat decision JSON to stdout", () => {
		let stdoutMsg = "";
		let exitCode = null;
		const origStderr = process.stderr.write.bind(process.stderr);
		const origStdout = process.stdout.write.bind(process.stdout);
		const origExit = process.exit.bind(process);
		process.stderr.write = (chunk) => {
			stderrMsg += chunk;
			return true;
		};
		process.stdout.write = (chunk) => {
			stdoutMsg += chunk;
			return true;
		};
		process.exit = (code) => {
			exitCode = code;
			throw new Error("__exit__");
		};
		try {
			stopBlock("placeholders found");
		} catch (err) {
			if (!err.message.includes("__exit__")) throw err;
		} finally {
			process.stderr.write = origStderr;
			process.stdout.write = origStdout;
			process.exit = origExit;
		}
		assert.equal(exitCode, 2);
		const parsed = JSON.parse(stdoutMsg.trim());
		assert.strictEqual(parsed.decision, "block");
		assert.ok(parsed.reason.includes("placeholders found"));
		assert.strictEqual(
			parsed.hookSpecificOutput,
			undefined,
			"stopBlock must not use hookSpecificOutput wrapper",
		);
	});
});
