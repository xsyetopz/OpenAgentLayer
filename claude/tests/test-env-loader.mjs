import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
	loadSecrets,
	loadStreamGuardConfig,
} from "../hooks/scripts/_env-loader.mjs";

function makeTmpDir() {
	return mkdtempSync(join(tmpdir(), "env-loader-test-"));
}

describe("loadSecrets", () => {
	it("should load key-value pairs from .env", () => {
		const dir = makeTmpDir();
		writeFileSync(
			join(dir, ".env"),
			'DATABASE_URL="postgres://user:s3cretpass@host/db"\nAPI_KEY=sk-ant-longvalue1234567890abc\nPUBLIC_URL=https://example.com\n',
		);
		const { values, valueToName, varNames } = loadSecrets({
			cwd: dir,
			envFiles: [".env"],
		});
		assert.ok(values.has("sk-ant-longvalue1234567890abc"));
		assert.equal(valueToName.get("sk-ant-longvalue1234567890abc"), "API_KEY");
		assert.ok(varNames.has("DATABASE_URL"));
		assert.ok(varNames.has("API_KEY"));
		assert.ok(!varNames.has("PUBLIC_URL"), "PUBLIC_ prefix should be skipped");
		rmSync(dir, { recursive: true });
	});

	it("should skip values shorter than minSecretLength", () => {
		const dir = makeTmpDir();
		writeFileSync(join(dir, ".env"), "SHORT=abc\nLONG=abcdefghijklmnop\n");
		const { values } = loadSecrets({ cwd: dir, envFiles: [".env"] });
		assert.ok(!values.has("abc"));
		assert.ok(values.has("abcdefghijklmnop"));
		rmSync(dir, { recursive: true });
	});

	it("should handle quoted values", () => {
		const dir = makeTmpDir();
		writeFileSync(
			join(dir, ".env"),
			"SECRET='my-long-secret-value-here'\nOTHER=\"another-long-secret-val\"\n",
		);
		const { values } = loadSecrets({ cwd: dir, envFiles: [".env"] });
		assert.ok(values.has("my-long-secret-value-here"));
		assert.ok(values.has("another-long-secret-val"));
		rmSync(dir, { recursive: true });
	});

	it("should skip missing files gracefully", () => {
		const dir = makeTmpDir();
		const { values } = loadSecrets({
			cwd: dir,
			envFiles: [".env", ".env.local"],
		});
		assert.equal(values.size, 0);
		rmSync(dir, { recursive: true });
	});

	it("should respect custom safe prefixes", () => {
		const dir = makeTmpDir();
		writeFileSync(
			join(dir, ".env"),
			"VITE_KEY=some-long-public-value\nSECRET_KEY=some-long-secret-val\n",
		);
		const { values } = loadSecrets({
			cwd: dir,
			envFiles: [".env"],
			safeEnvPrefixes: ["VITE_"],
		});
		assert.ok(!values.has("some-long-public-value"));
		assert.ok(values.has("some-long-secret-val"));
		rmSync(dir, { recursive: true });
	});
});

describe("loadStreamGuardConfig", () => {
	it("should return defaults when no config file exists", () => {
		const dir = makeTmpDir();
		const config = loadStreamGuardConfig(dir);
		assert.equal(config.enabled, true);
		assert.ok(Array.isArray(config.envFiles));
		assert.equal(config.minSecretLength, 8);
		rmSync(dir, { recursive: true });
	});

	it("should load config from .streamguardrc.json", () => {
		const dir = makeTmpDir();
		writeFileSync(
			join(dir, ".streamguardrc.json"),
			JSON.stringify({ enabled: true, minSecretLength: 12, verbose: true }),
		);
		const config = loadStreamGuardConfig(dir);
		assert.equal(config.minSecretLength, 12);
		assert.equal(config.verbose, true);
		rmSync(dir, { recursive: true });
	});
});
