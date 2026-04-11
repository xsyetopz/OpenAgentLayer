#!/usr/bin/env node
import {
	deny,
	passthrough,
	readStdin,
	resolveToolInput,
	resolveToolName,
} from "../_lib.mjs";

const SECRET_PATH_RE = /(^|\/)(\.env($|\.)|.*\.(pem|key))$/i;

(async () => {
	const data = await readStdin();
	const toolName = resolveToolName(data).toLowerCase();
	if (!["read", "view", "edit", "write", "create"].includes(toolName)) {
		passthrough();
	}

	const input = resolveToolInput(data);
	const filePath = String(input?.filePath || input?.path || "").trim();
	if (!filePath) passthrough();
	if (!SECRET_PATH_RE.test(filePath)) passthrough();

	deny(`openagentsbtw blocked access to a secret-like path: ${filePath}`);
})();
