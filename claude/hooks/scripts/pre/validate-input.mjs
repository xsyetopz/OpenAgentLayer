#!/usr/bin/env node
import "../suppress-stderr.mjs";
import { deny, passthrough, readStdin } from "../_lib.mjs";

function validateWrite(toolInput) {
	const fp = toolInput.file_path ?? "";
	if (!fp?.startsWith("/")) return "file_path must be an absolute path";
	const content = toolInput.content ?? "";
	if (!content) return "content must be non-empty";
	return null;
}

function validateEdit(toolInput) {
	const fp = toolInput.file_path ?? "";
	if (!fp?.startsWith("/")) return "file_path must be an absolute path";
	const oldStr = toolInput.old_string ?? "";
	const newStr = toolInput.new_string ?? "";
	if (!oldStr) return "old_string must be non-empty";
	if (!newStr) return "new_string must be non-empty";
	if (oldStr === newStr) return "old_string and new_string must be different";
	return null;
}

function validateBash(toolInput) {
	const cmd = toolInput.command ?? "";
	if (!cmd?.trim()) return "command must be non-empty";
	return null;
}

function validateRead(toolInput) {
	const fp = toolInput.file_path ?? "";
	if (!fp?.startsWith("/")) return "file_path must be an absolute path";
	return null;
}

function validateWebFetch(toolInput) {
	const url = toolInput.url ?? "";
	if (!url) return "url must be non-empty";
	if (!url.startsWith("http://") && !url.startsWith("https://")) {
		return "url must start with http:// or https://";
	}
	return null;
}

const VALIDATORS = {
	Write: validateWrite,
	Edit: validateEdit,
	Bash: validateBash,
	Read: validateRead,
	WebFetch: validateWebFetch,
};

(async () => {
	try {
		const data = await readStdin();
		if (!data) passthrough();

		const toolName = data.tool_name ?? "";
		const toolInput = data.tool_input ?? {};

		const validator = VALIDATORS[toolName];
		if (!validator) passthrough();

		const error = validator(toolInput);
		if (error) deny(`[schema] ${toolName}: ${error}`);

		passthrough();
	} catch {
		passthrough();
	}
})();
