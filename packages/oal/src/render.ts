import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { adapterFor } from "./adapters";
import {
	cleanDirectory,
	createTempDirectory,
	type JsonObject,
	loadSource,
	sha256,
	sourceFiles,
	stableStringify,
	withRawSchemaUrl,
	writeStableJson,
} from "./source";

interface RenderedFile {
	path: string;
	sha256: string;
	sources: string[];
}

export interface RenderManifest {
	generated_at: string;
	generator: string;
	files: RenderedFile[];
}

const generatedAt = "1970-01-01T00:00:00.000Z";
export function render(
	root = process.cwd(),
	outDir = "generated",
): RenderManifest {
	const graph = loadSource(root);
	const absoluteOut = resolve(root, outDir);
	cleanDirectory(absoluteOut);

	const files: RenderedFile[] = [];
	const writeJson = (
		relativePath: string,
		value: unknown,
		sources: string[],
	) => {
		const absolutePath = join(absoluteOut, relativePath);
		writeStableJson(absolutePath, withRawSchemaUrl(value));
		files.push({
			path: relativePath,
			sha256: sha256(readFileSync(absolutePath)),
			sources,
		});
	};

	writeJson(
		"source-index.json",
		{
			agents: graph.agents.map((agent) => agent.data["id"]).sort(),
			hooks: graph.hooks.map((hook) => hook.data["id"]).sort(),
			name: graph.root.data["name"],
			platforms: graph.platforms.map((platform) => platform.data["id"]).sort(),
			providers: Object.keys(
				graph.providers.data["providers"] as JsonObject,
			).sort(),
			routes: graph.root.data["routes"],
			tools: Object.keys(graph.tools.data["tools"] as JsonObject).sort(),
			version: graph.root.data["version"],
		},
		sourceFiles(graph).map((file) => file.path),
	);

	for (const agent of graph.agents) {
		writeJson(`agents/${agent.data["id"]}.json`, agent.data, [agent.path]);
	}
	for (const platform of graph.platforms) {
		const id = String(platform.data["id"]);
		const config = graph.platformConfigs.find(
			(file) => file.data["platform"] === id,
		);
		writeJson(`platforms/${id}/platform.json`, platform.data, [platform.path]);
		if (config) {
			writeJson(`platforms/${id}/config-policy.json`, config.data, [
				config.path,
			]);
		}
	}
	for (const platform of graph.root.data["platforms"] as string[]) {
		const adapter = adapterFor(platform);
		if (!adapter) {
			throw new Error(
				`enabled platform has no registered adapter: ${platform}`,
			);
		}
		for (const payload of adapter.render(root, graph)) {
			const absolutePath = join(absoluteOut, payload.path);
			mkdirSync(dirname(absolutePath), { recursive: true });
			writeFileSync(absolutePath, payload.content);
			files.push({
				path: payload.path,
				sha256: sha256(readFileSync(absolutePath)),
				sources: payload.sourcePaths,
			});
		}
	}

	const explainMap = Object.fromEntries(
		files.map((file) => [
			file.path,
			{
				sha256: file.sha256,
				sources: file.sources,
			},
		]),
	);
	const manifest: RenderManifest = {
		files: [...files].sort((left, right) =>
			left.path.localeCompare(right.path),
		),
		generated_at: generatedAt,
		generator: "oal-render-core",
	};
	writeJson(
		".oal/explain-map.json",
		explainMap,
		sourceFiles(graph).map((file) => file.path),
	);
	writeJson(
		".oal/managed-files.json",
		{
			files: [
				...manifest.files.map((file) => file.path),
				".oal/explain-map.json",
				".oal/managed-files.json",
				".oal/render-manifest.json",
			].sort(),
			managed_by: "OpenAgentLayer",
		},
		sourceFiles(graph).map((file) => file.path),
	);
	writeJson(
		".oal/render-manifest.json",
		manifest,
		sourceFiles(graph).map((file) => file.path),
	);

	return manifest;
}

export function explain(
	root: string,
	generatedPath: string,
	outDir = "generated",
): unknown {
	const mapPath = resolve(root, outDir, ".oal/explain-map.json");
	const explainMap = JSON.parse(readFileSync(mapPath, "utf8")) as JsonObject;
	const absoluteGenerated = resolve(root, generatedPath);
	const absoluteOut = resolve(root, outDir);
	const outputPath = relative(absoluteOut, absoluteGenerated)
		.split(sep)
		.join("/");
	return explainMap[outputPath] ?? explainMap[generatedPath];
}

export function assertRenderIdempotent(root = process.cwd()): void {
	const first = createTempDirectory("oal-render-a-");
	const second = createTempDirectory("oal-render-b-");
	try {
		render(root, first);
		render(root, second);
		const left = snapshotTree(first);
		const right = snapshotTree(second);
		if (stableStringify(left) !== stableStringify(right)) {
			throw new Error("render output is not deterministic");
		}
	} finally {
		if (existsSync(first)) {
			rmSync(first, { force: true, recursive: true });
		}
		if (existsSync(second)) {
			rmSync(second, { force: true, recursive: true });
		}
	}
}

function snapshotTree(root: string): JsonObject {
	const snapshot: JsonObject = {};
	for (const path of listFiles(root)) {
		const key = relative(root, path).split(sep).join("/");
		snapshot[key] = readFileSync(path, "utf8");
	}
	return snapshot;
}

function listFiles(root: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(root).sort()) {
		const path = join(root, entry);
		if (statSync(path).isDirectory()) {
			files.push(...listFiles(path));
		} else {
			files.push(path);
		}
	}
	return files.sort();
}
