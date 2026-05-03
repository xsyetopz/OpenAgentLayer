const COLORS = {
	fatal: "\x1b[35m",
	error: "\x1b[31m",
	warn: "\x1b[33m",
	note: "\x1b[36m",
	fix: "\x1b[32m",
	reset: "\x1b[0m",
};

function colorEnabled() {
	return process.env.NO_COLOR !== "1" && process.env.OAL_HOOK_COLOR !== "0";
}

export function styleHookMessage(level, text) {
	if (!(colorEnabled() && text)) return text;
	const color = COLORS[level] ?? COLORS.note;
	return `${color}${text}${COLORS.reset}`;
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
