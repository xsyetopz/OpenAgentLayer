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
		assert.equal(output.reason, "warning text");
		assert.ok(!("hookSpecificOutput" in output));
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
		assert.equal(output.decision, "block");
		assert.equal(output.reason, "blocked");
		assert.ok(!("hookSpecificOutput" in output));
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
	it("should have correct output structure", () => {
		const output = captureExit(stopWarn, "stale session");
		assert.equal(output.hookSpecificOutput.hookEventName, "Stop");
		assert.equal(output.hookSpecificOutput.additionalContext, "stale session");
	});

	it("should have no extra fields", () => {
		const output = captureExit(stopWarn, "msg");
		const keys = Object.keys(output.hookSpecificOutput);
		assert.deepEqual(
			new Set(keys),
			new Set(["hookEventName", "additionalContext"]),
		);
	});

	it("should validate against schema", { skip: !Ajv }, () => {
		const ajv = new Ajv();
		const validate = ajv.compile(loadSchema());
		const output = captureExit(stopWarn, "test");
		assert.ok(validate(output), JSON.stringify(validate.errors));
	});
});

describe("StopBlock", () => {
	it("should have correct output structure", () => {
		const output = captureExit(stopBlock, "placeholders found");
		assert.equal(output.decision, "block");
		assert.equal(output.reason, "placeholders found");
		assert.ok(!("hookSpecificOutput" in output));
	});

	it("should validate against schema", { skip: !Ajv }, () => {
		const ajv = new Ajv();
		const validate = ajv.compile(loadSchema());
		const output = captureExit(stopBlock, "test");
		assert.ok(validate(output), JSON.stringify(validate.errors));
	});
});
