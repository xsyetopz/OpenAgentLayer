import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function seedUserFiles(targetRoot: string): Promise<void> {
	await writeFile(join(targetRoot, "USER_OWNED.txt"), "must remain\n", {
		flag: "w",
	});
	await mkdir(join(targetRoot, ".codex"), { recursive: true });
	await mkdir(join(targetRoot, ".claude"), { recursive: true });
	await writeFile(
		join(targetRoot, ".codex/config.toml"),
		"user_owned = true\n",
	);
	await writeFile(
		join(targetRoot, ".claude/settings.json"),
		JSON.stringify({ userOwned: true }, undefined, 2),
	);
	await writeFile(
		join(targetRoot, "opencode.jsonc"),
		JSON.stringify({ userOwned: true }, undefined, 2),
	);
	await writeFile(
		join(targetRoot, "AGENTS.md"),
		"# User Agents\n\nKeep this user content.\n",
	);
	await writeFile(
		join(targetRoot, "CLAUDE.md"),
		"# User Claude\n\nKeep this user content.\n",
	);
}

export async function assertRenderedConfigs(targetRoot: string): Promise<void> {
	JSON.parse(
		stripJsonComments(
			await readFile(join(targetRoot, ".claude/settings.json"), "utf8"),
		),
	);
	JSON.parse(
		stripJsonComments(
			await readFile(join(targetRoot, "opencode.jsonc"), "utf8"),
		),
	);
	await assertUserJsonConfig(targetRoot);
	const codex = await readFile(join(targetRoot, ".codex/config.toml"), "utf8");
	if (!codex.includes("user_owned = true"))
		throw new Error("TOML config merge did not preserve user-owned keys");
	for (const required of [
		"gpt-5.5",
		"gpt-5.4",
		"gpt-5.4-mini",
		"gpt-5.3-codex",
		"shell_snapshot = false",
		"codex_git_commit = false",
	])
		if (!codex.includes(required))
			throw new Error(`Codex config missing \`${required}\``);
}

export async function assertMarkedBlocksInstalled(
	targetRoot: string,
): Promise<void> {
	for (const path of ["AGENTS.md", "CLAUDE.md"]) {
		const content = await readFile(join(targetRoot, path), "utf8");
		if (!content.includes("Keep this user content."))
			throw new Error(
				`${path} user content was not preserved during marked-block deploy.`,
			);
		if (
			!content.includes(
				`<!-- >>> oal ${path === "AGENTS.md" ? "codex" : "claude"} >>> -->`,
			)
		)
			throw new Error(`\`${path}\` missing OAL marked block`);
	}
}

export async function assertBackupsCreated(targetRoot: string): Promise<void> {
	for (const path of ["AGENTS.md", "CLAUDE.md", ".codex__config.toml.bak"]) {
		const backupName = path.includes(".bak") ? path : `${path}.bak`;
		const backupPath = join(
			targetRoot,
			".oal",
			"backups",
			backupName.replaceAll("/", "__"),
		);
		try {
			await readFile(backupPath, "utf8");
		} catch {
			throw new Error(`Missing backup \`${backupPath}\``);
		}
	}
}

export async function assertUserBlocksPreservedAfterUninstall(
	targetRoot: string,
): Promise<void> {
	for (const path of ["AGENTS.md", "CLAUDE.md"]) {
		const content = await readFile(join(targetRoot, path), "utf8");
		if (!content.includes("Keep this user content."))
			throw new Error(
				`${path} user content was not preserved after uninstall.`,
			);
		if (
			content.includes(
				`<!-- >>> oal ${path === "AGENTS.md" ? "codex" : "claude"} >>> -->`,
			)
		)
			throw new Error(
				`${path} still contains OAL marked block after uninstall.`,
			);
	}
}

export async function assertUserConfigPreservedAfterUninstall(
	targetRoot: string,
): Promise<void> {
	const codex = await readFile(join(targetRoot, ".codex/config.toml"), "utf8");
	if (!codex.includes("user_owned = true"))
		throw new Error("Codex user config was not preserved after uninstall");
	await assertUserJsonConfig(targetRoot);
}

async function assertUserJsonConfig(targetRoot: string): Promise<void> {
	const claude = JSON.parse(
		await readFile(join(targetRoot, ".claude/settings.json"), "utf8"),
	) as { userOwned?: boolean };
	const opencode = JSON.parse(
		stripJsonComments(
			await readFile(join(targetRoot, "opencode.jsonc"), "utf8"),
		),
	) as { userOwned?: boolean };
	if (claude.userOwned !== true || opencode.userOwned !== true)
		throw new Error("JSON user config was not preserved");
}

function stripJsonComments(text: string): string {
	return text
		.split("\n")
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n");
}
