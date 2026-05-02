#!/usr/bin/env node

import { asString, createHookRunner } from "./_runtime.mjs";

function evaluate(payload) {
	const route = asString(payload.route);
	const provider = asString(payload.provider);
	if (!(route && provider)) {
		return {
			decision: "warn",
			reason: "Context input missing route or provider.",
		};
	}
	return {
		decision: "pass",
		reason: "Context injection payload accepted.",
		details: [`provider=${provider}`, `route=${route}`],
	};
}

createHookRunner("inject-git-context", evaluate);
