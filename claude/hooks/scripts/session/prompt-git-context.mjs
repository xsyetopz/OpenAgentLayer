#!/usr/bin/env node
import "../suppress-stderr.mjs";
import { auditLog, hiddenContext, passthrough, readStdin } from "../_lib.mjs";
import { renderCavemanContext, updateSessionMode } from "./_caveman.mjs";
import {
	buildRouteContext,
	getGitContext,
	resolveSkillRoute,
} from "./_route-context.mjs";

(async () => {
	try {
		const data = await readStdin();
		const prompt = (data.prompt ?? "").trim();

		if (!prompt) {
			passthrough();
		}

		auditLog("UserPromptSubmit", "user-prompt-submit.mjs", "processed");

		const gitCtx = getGitContext();
		const contract = resolveSkillRoute(prompt);
		const cavemanContext = renderCavemanContext(updateSessionMode(prompt));
		const routeContext = buildRouteContext(contract, [
			...(gitCtx ? [`Git context:\n${gitCtx}`] : []),
			...(cavemanContext ? [cavemanContext] : []),
		]);
		if (routeContext) {
			hiddenContext(routeContext, "UserPromptSubmit");
		} else {
			passthrough();
		}
	} catch {
		passthrough();
	}
})();
