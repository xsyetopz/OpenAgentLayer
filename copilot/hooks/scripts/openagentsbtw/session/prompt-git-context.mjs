#!/usr/bin/env node
import {
	additionalContext,
	passthrough,
	readStdin,
	resolveCwd,
} from "../_lib.mjs";
import { renderCavemanContext, updateSessionMode } from "./_caveman.mjs";
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
	const cavemanContext = renderCavemanContext(updateSessionMode(prompt));
	const routeContext = buildRouteContext(contract, [
		...(gitContext ? [`Git context:\n${gitContext}`] : []),
		...(cavemanContext ? [cavemanContext] : []),
	]);
	if (!routeContext) passthrough();
	additionalContext(routeContext);
})();
