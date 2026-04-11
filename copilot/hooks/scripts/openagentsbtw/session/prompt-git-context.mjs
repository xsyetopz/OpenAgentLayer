#!/usr/bin/env node
import {
	additionalContext,
	passthrough,
	readStdin,
	resolveCwd,
} from "../_lib.mjs";
import {
	buildRouteContext,
	getGitContext,
	resolveSkillRoute,
} from "./_route-context.mjs";

(async () => {
	const data = await readStdin();
	const cwd = resolveCwd(data);
	const prompt = String(data.prompt ?? "").trim();
	const gitContext = getGitContext(cwd);
	const contract = resolveSkillRoute(prompt);
	const routeContext = buildRouteContext(
		contract,
		gitContext ? [`Git context:\n${gitContext}`] : [],
	);
	if (!routeContext) passthrough();
	additionalContext(routeContext);
})();
