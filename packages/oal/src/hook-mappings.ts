import type { JsonObject, SourceFile } from "./source";

export interface HookMappingCheck {
	message: string;
	ok: boolean;
	path: string;
}

export function validateHookMappings(
	hook: SourceFile,
	hookEvents: SourceFile,
	platformIds: string[],
	targetPlatform?: string,
): HookMappingCheck[] {
	const checks: HookMappingCheck[] = [];
	const category = String(hook.data["category"]);
	const supported = (hook.data["supported_platforms"] as JsonObject) ?? {};
	const unsupported = (hook.data["unsupported_platforms"] as JsonObject) ?? {};
	const platformEvents =
		(hookEvents.data["platform_events"] as JsonObject | undefined) ?? {};
	const platforms = targetPlatform ? [targetPlatform] : platformIds;
	for (const platform of platforms) {
		const supportedMapping = supported[platform] as JsonObject | undefined;
		const unsupportedReason = unsupported[platform];
		if (supportedMapping && unsupportedReason) {
			checks.push({
				message: `${hook.data["id"]}: ${platform} cannot be both supported and unsupported`,
				ok: false,
				path: hook.path,
			});
			continue;
		}
		if (!(supportedMapping || unsupportedReason)) {
			checks.push({
				message: `${hook.data["id"]}: ${platform} missing supported mapping or unsupported reason`,
				ok: false,
				path: hook.path,
			});
			continue;
		}
		if (!supportedMapping) {
			checks.push({
				message: `${hook.data["id"]}: ${platform} unsupported: ${String(unsupportedReason)}`,
				ok: true,
				path: hook.path,
			});
			continue;
		}
		const allowedEvents =
			((platformEvents[platform] as JsonObject | undefined)?.[category] as
				| string[]
				| undefined) ?? [];
		const events = supportedMapping["events"] as string[];
		const invalidEvent = events.find((event) => !allowedEvents.includes(event));
		if (invalidEvent) {
			checks.push({
				message: `${hook.data["id"]}: ${platform} unknown hook event ${invalidEvent}`,
				ok: false,
				path: hook.path,
			});
			continue;
		}
		checks.push({
			message: `${hook.data["id"]}: ${platform} hook mapping supported`,
			ok: true,
			path: hook.path,
		});
	}
	return checks;
}
