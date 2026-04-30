import {
	extractBooleanMetadata,
	extractCommand,
	extractMetadata,
	extractPaths,
	extractStringMetadata,
	extractTextBlobs,
} from "./payload";
import type { RuntimeDecision, RuntimePayload } from "./types";

const SECRET_VALUE_PATTERN =
	/(api[_-]?key|secret|token|password|BEGIN [A-Z ]*PRIVATE KEY)/iu;
const PLACEHOLDER_PATTERN =
	/\b(TODO|FIXME|XXX|stub|placeholder|not implemented|coming soon|lorem ipsum)\b/iu;
const PROTECTED_BRANCH_PATTERN = /\b(main|master|release|production)\b/iu;
const PROTECTED_BRANCH_COMMAND_PATTERN =
	/git\s+push|git\s+merge|git\s+reset|git\s+commit/iu;

export function evaluateFailureCircuit(
	payload: RuntimePayload,
): RuntimeDecision {
	const metadata = extractMetadata(payload);
	const failures = Number(
		metadata["recent_failures"] ?? metadata["failures"] ?? 0,
	);
	if (failures >= 3) {
		return {
			context: { recent_failures: failures },
			decision: "warn",
			policy_id: "failure-circuit",
			message:
				"Repeated tool failures detected; stop retry loops and reassess route.",
		};
	}
	return {
		decision: "allow",
		policy_id: "failure-circuit",
		message: "Failure circuit threshold not reached.",
	};
}

export function evaluatePromptGitContext(
	payload: RuntimePayload,
): RuntimeDecision {
	const branch = extractStringMetadata(payload, "branch") ?? "unknown";
	const dirty = extractBooleanMetadata(payload, "dirty");
	return {
		context: {
			prompt_context: `Git branch: ${branch}; dirty tree: ${dirty === undefined ? "unknown" : dirty}.`,
		},
		decision: "context",
		policy_id: "prompt-git-context",
		message: "Git context attached to prompt route.",
	};
}

export function evaluateProtectedBranchConfirm(
	payload: RuntimePayload,
): RuntimeDecision {
	const command = extractCommand(payload);
	const branch = extractStringMetadata(payload, "branch") ?? command;
	const isConfirmed = extractBooleanMetadata(payload, "confirmed") === true;
	if (PROTECTED_BRANCH_COMMAND_PATTERN.test(command)) {
		if (PROTECTED_BRANCH_PATTERN.test(branch) && !isConfirmed) {
			return {
				decision: "deny",
				policy_id: "protected-branch-confirm",
				message: "Protected branch operation requires explicit confirmation.",
			};
		}
	}
	return {
		decision: "allow",
		policy_id: "protected-branch-confirm",
		message: "No unconfirmed protected branch operation detected.",
	};
}

export function evaluateStagedSecretGuard(
	payload: RuntimePayload,
): RuntimeDecision {
	const candidate = [
		...extractTextBlobs(payload),
		...extractPaths(payload),
	].find((blob) => SECRET_VALUE_PATTERN.test(blob));
	if (candidate !== undefined) {
		return {
			decision: "deny",
			policy_id: "staged-secret-guard",
			message: "Secret-bearing staged content blocked.",
		};
	}
	return {
		decision: "allow",
		policy_id: "staged-secret-guard",
		message: "No staged secret content detected.",
	};
}

export function evaluateSubagentRouteContext(
	payload: RuntimePayload,
): RuntimeDecision {
	const route =
		payload.route ?? extractStringMetadata(payload, "route") ?? "unspecified";
	return {
		context: { route },
		decision: "context",
		policy_id: "subagent-route-context",
		message: "Subagent route context attached.",
	};
}

export function evaluateWriteQuality(payload: RuntimePayload): RuntimeDecision {
	const match = extractTextBlobs(payload).find((blob) =>
		PLACEHOLDER_PATTERN.test(blob),
	);
	if (match !== undefined) {
		return {
			decision: "deny",
			policy_id: "write-quality",
			message: "Write-quality guard blocked placeholder output.",
		};
	}
	return {
		decision: "allow",
		policy_id: "write-quality",
		message: "Write-quality guard passed.",
	};
}
