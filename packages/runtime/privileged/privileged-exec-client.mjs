#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const input = readFileSync(0, "utf8");
const server = join(
	dirname(fileURLToPath(import.meta.url)),
	"privileged-exec.mjs",
);
const result = spawnSync(process.execPath, [server], {
	input,
	encoding: "utf8",
	env: process.env,
});

process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");
process.exit(result.status ?? 1);
