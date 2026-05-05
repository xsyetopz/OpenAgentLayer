const COLORS = {
	fatal: "\x1b[35m",
	error: "\x1b[31m",
	warn: "\x1b[33m",
	note: "\x1b[36m",
	fix: "\x1b[32m",
	reset: "\x1b[0m",
};
const DEFAULT_WRAP_COLUMNS = 88;
const INDENT_PATTERN = /^\s*/;
const WORD_SPLIT_PATTERN = /(\s+)/;
const WHITESPACE_ONLY_PATTERN = /^\s+$/;

function colorEnabled() {
	return process.env.NO_COLOR !== "1" && process.env.OAL_HOOK_COLOR !== "0";
}

export function styleHookMessage(level, text) {
	if (!(colorEnabled() && text)) return text;
	const color = COLORS[level] ?? COLORS.note;
	return wrapHookText(String(text))
		.map((line) => `${color}${line}${COLORS.reset}`)
		.join("\n");
}

export function styleHookLines(level, lines) {
	return lines.map((line) => {
		const text = String(line);
		const output = ` ${text}`;
		if (text.startsWith("Use: ") || text.startsWith("Use when useful: "))
			return styleHookMessage("fix", output);
		return styleHookMessage(level, output);
	});
}

function wrapHookText(text) {
	const width = wrapColumns();
	return text.split("\n").flatMap((line) => wrapLine(line, width));
}

function wrapColumns() {
	const configured = Number(process.env.OAL_HOOK_WRAP_COLUMNS);
	if (Number.isFinite(configured) && configured >= 24) return configured;
	return DEFAULT_WRAP_COLUMNS;
}

function wrapLine(line, width) {
	if (line.length <= width) return [line];
	const indent = line.match(INDENT_PATTERN)?.[0] ?? "";
	const continuationIndent = `${indent}  `;
	const words = line.trimEnd().split(WORD_SPLIT_PATTERN);
	const lines = [];
	let current = "";
	for (const word of words) {
		if (!word) continue;
		if (WHITESPACE_ONLY_PATTERN.test(word)) {
			if (current && !current.endsWith(" ")) current += " ";
			continue;
		}
		const next = current ? `${current}${word}` : `${indent}${word}`;
		if (visibleLength(next) <= width) {
			current = next;
			continue;
		}
		if (current.trim().length > 0) lines.push(current.trimEnd());
		current = `${lines.length > 0 ? continuationIndent : indent}${word}`;
		while (visibleLength(current) > width) {
			lines.push(current.slice(0, width));
			current = `${continuationIndent}${current.slice(width)}`;
		}
	}
	if (current.trim().length > 0) lines.push(current.trimEnd());
	return lines.length > 0 ? lines : [line];
}

function visibleLength(text) {
	return text.length;
}
