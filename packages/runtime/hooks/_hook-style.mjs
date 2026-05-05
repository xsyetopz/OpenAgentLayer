const COLORS = {
	fatal: "\x1b[35m",
	error: "\x1b[31m",
	warn: "\x1b[33m",
	note: "\x1b[36m",
	fix: "\x1b[32m",
	reset: "\x1b[0m",
};
const DEFAULT_WRAP_COLUMNS = 88;
const DEFAULT_TERMINAL_COLUMNS = 80;
const DEFAULT_PROVIDER_PREFIX_COLUMNS = 28;
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
		const hint = renderedHint(text);
		if (hint) return styleHookMessage("fix", ` ${hint}`);
		const output = ` ${text}`;
		return styleHookMessage(level, output);
	});
}

export function renderedHint(text) {
	if (text.startsWith("Use: ")) return `did you mean \`${text.slice(5)}\`?`;
	if (text.startsWith("Use when useful: "))
		return `when useful, try \`${text.slice(17)}\``;
	return "";
}

function wrapHookText(text) {
	const width = wrapColumns();
	return text.split("\n").flatMap((line) => wrapLine(line, width));
}

function wrapColumns() {
	const configured = Number(process.env.OAL_HOOK_WRAP_COLUMNS);
	if (Number.isFinite(configured) && configured >= 24) return configured;
	const terminalColumns = Number(process.env.COLUMNS);
	const width =
		Number.isFinite(terminalColumns) && terminalColumns >= 40
			? terminalColumns
			: DEFAULT_TERMINAL_COLUMNS;
	const prefixColumns = Number(process.env.OAL_HOOK_PREFIX_COLUMNS);
	const reservedPrefix =
		Number.isFinite(prefixColumns) && prefixColumns >= 0
			? prefixColumns
			: DEFAULT_PROVIDER_PREFIX_COLUMNS;
	return Math.max(24, Math.min(DEFAULT_WRAP_COLUMNS, width - reservedPrefix));
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
			const prefix = current.match(INDENT_PATTERN)?.[0] ?? "";
			const content = current.slice(prefix.length);
			const breakIndex = longTokenBreakIndex(content, width - prefix.length);
			lines.push(`${prefix}${content.slice(0, breakIndex)}`.trimEnd());
			current = `${continuationIndent}${content.slice(breakIndex)}`;
		}
	}
	if (current.trim().length > 0) lines.push(current.trimEnd());
	return lines.length > 0 ? lines : [line];
}

function longTokenBreakIndex(content, width) {
	const boundedWidth = Math.max(1, width);
	const slashIndex = content.lastIndexOf("/", boundedWidth);
	if (slashIndex > 0) return slashIndex;
	return boundedWidth;
}

function visibleLength(text) {
	return text.length;
}
