#!/usr/bin/env node
import "../suppress-stderr.mjs";
import { execFileSync } from "node:child_process";
import { deny, passthrough, readStdin } from "../_lib.mjs";

const TIMEOUT_SECS = 5;

const url = (process.env.CCA_HTTP_HOOK_URL || "").trim();
if (!url) passthrough();

(async () => {
	try {
		const data = await readStdin();
		if (!data || !Object.keys(data).length) passthrough();

		const token = (process.env.CCA_HTTP_HOOK_TOKEN || "").trim();
		const failClosed =
			(process.env.CCA_HTTP_HOOK_FAIL_CLOSED || "").trim() === "1";

		const body = JSON.stringify(data);
		const curlArgs = [
			"--silent",
			"--max-time",
			String(TIMEOUT_SECS),
			"--write-out",
			"\n%{http_code}",
			"-X",
			"POST",
			"-H",
			"Content-Type: application/json",
			"--data-raw",
			body,
		];

		if (token) {
			curlArgs.push("-H", `Authorization: Bearer ${token}`);
		}

		curlArgs.push(url);

		try {
			const raw = execFileSync("curl", curlArgs, {
				encoding: "utf8",
				timeout: (TIMEOUT_SECS + 2) * 1000,
			});
			const lines = raw.trimEnd().split("\n");
			const statusCode = parseInt(lines[lines.length - 1], 10);
			const respBody = lines.slice(0, -1).join("\n").trim();

			if (statusCode === 204) passthrough();
			if (!respBody) passthrough();

			try {
				const result = JSON.parse(respBody);
				process.stdout.write(`${JSON.stringify(result)}\n`);
				process.exit(0);
			} catch {
				passthrough();
			}
		} catch {
			if (failClosed) {
				deny(
					"[http-hook] Enterprise DLP server unreachable and CCA_HTTP_HOOK_FAIL_CLOSED=1. Blocking action.",
				);
			}
			passthrough();
		}
	} catch {
		passthrough();
	}
})();
