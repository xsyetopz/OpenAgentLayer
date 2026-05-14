import { asArray, asObject, asString } from "./_runtime.mjs";
import { WHITESPACE_SPLIT_PATTERN } from "./_patterns.mjs";

const COMMAND_FIELDS = ["command", "toolCommand", "rawCommand", "script"];
const GENERIC_COMMAND_FIELDS = ["input"];
const PATH_FIELDS = [
	"path",
	"filePath",
	"file_path",
	"filename",
	"target",
	"source",
	"destination",
];
const TEXT_FIELDS = [
	"output",
	"stdout",
	"stderr",
	"text",
	"response",
	"content",
	"finalResponse",
];
const QUOTE_EDGE_PATTERN = /^["']|["']$/g;

function nestedObjects(payload) {
	const objects = [asObject(payload)];
	for (const key of ["tool_input", "toolInput", "args", "arguments", "input"]) {
		const object = asObject(payload[key]);
		if (Object.keys(object).length > 0) objects.push(object);
	}
	return objects;
}

export function extractCommand(payload) {
	return extractCommands(payload)[0] ?? "";
}

export function extractCommands(payload) {
	const commands = [];
	for (const object of nestedObjects(payload)) {
		for (const field of COMMAND_FIELDS) {
			const value = asString(object[field]);
			if (value) commands.push(value);
		}
		if (shellToolPayload(payload) || shellToolPayload(object)) {
			for (const field of GENERIC_COMMAND_FIELDS) {
				const value = asString(object[field]);
				if (value) commands.push(value);
			}
		}
	}
	return [...new Set(commands)];
}

function shellToolPayload(payload) {
	const object = asObject(payload);
	const toolName = (
		asString(object.tool_name) ||
		asString(object.toolName) ||
		asString(object.name) ||
		asString(object.tool)
	).toLowerCase();
	return [
		"bash",
		"shell",
		"sh",
		"zsh",
		"terminal",
		"shell_command",
		"functions.shell_command",
	].includes(toolName);
}

export function extractPaths(payload) {
	const paths = [];
	for (const path of asArray(payload.paths)) paths.push(asString(path));
	for (const entry of asArray(payload.files)) {
		const file = asObject(entry);
		for (const field of PATH_FIELDS) paths.push(asString(file[field]));
	}
	for (const object of nestedObjects(payload)) {
		for (const field of PATH_FIELDS) paths.push(asString(object[field]));
	}
	for (const command of extractCommands(payload)) {
		for (const token of command.split(WHITESPACE_SPLIT_PATTERN)) {
			const cleaned = token.replace(QUOTE_EDGE_PATTERN, "");
			if (cleaned.includes("/") || cleaned.includes(".")) paths.push(cleaned);
		}
	}
	return [...new Set(paths.filter(Boolean))];
}

export function extractText(payload) {
	const texts = [];
	for (const object of nestedObjects(payload)) {
		for (const field of TEXT_FIELDS) {
			const value = asString(object[field]);
			if (value) texts.push(value);
		}
	}
	for (const entry of asArray(payload.messages)) {
		const message = asObject(entry);
		const content = asString(message.content) || asString(message.text);
		if (content) texts.push(content);
	}
	return [...new Set(texts)].join("\n");
}
