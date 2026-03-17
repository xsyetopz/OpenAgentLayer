#!/usr/bin/env node
import "./suppress-stderr.mjs";
import { deny, passthrough, readStdin } from "./_lib.mjs";

const TIMEOUT_MS = 5000;

const url = (process.env.CCA_HTTP_HOOK_URL ?? "").trim();
if (!url) passthrough();

(async () => {
	try {
		const data = await readStdin();
		if (!data) passthrough();

		const token = (process.env.CCA_HTTP_HOOK_TOKEN ?? "").trim();
		const failClosed =
			(process.env.CCA_HTTP_HOOK_FAIL_CLOSED ?? "").trim() === "1";

		const headers = { "Content-Type": "application/json" };
		if (token) headers.Authorization = `Bearer ${token}`;

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

		try {
			const resp = await fetch(url, {
				method: "POST",
				headers,
				body: JSON.stringify(data),
				signal: controller.signal,
			});
			clearTimeout(timer);

			if (resp.status === 204) passthrough();

			const body = (await resp.text()).trim();
			if (!body) passthrough();

			try {
				const result = JSON.parse(body);
				process.stdout.write(`${JSON.stringify(result)}\n`);
				process.exit(0);
			} catch {
				passthrough();
			}
		} catch {
			clearTimeout(timer);
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
