import { describe, expect, test } from "bun:test";
import {
	evaluatePermissionEscalationGuard,
	evaluateRtkEnforcementGuard,
	evaluateSecretPathGuard,
} from "@openagentlayer/runtime";

describe("OAL execution and permission guard runtime policies", () => {
	test("secret path guard denies real secrets and allows examples", () => {
		expect(evaluateSecretPathGuard({ paths: [".env"] }).decision).toBe("deny");
		expect(
			evaluateSecretPathGuard({ paths: ["config/.env.example"] }).decision,
		).toBe("allow");
	});

	test("RTK guard denies supported unwrapped commands", () => {
		expect(
			evaluateRtkEnforcementGuard({ command: "git status" }).decision,
		).toBe("deny");
		expect(
			evaluateRtkEnforcementGuard({ command: "rtk git status" }).decision,
		).toBe("allow");
	});

	test("permission escalation requires justification and risk", () => {
		expect(
			evaluatePermissionEscalationGuard({ event: "PermissionRequest" })
				.decision,
		).toBe("deny");
		expect(
			evaluatePermissionEscalationGuard({
				event: "PermissionRequest",
				metadata: { justification: "Run privileged check.", risk: "low" },
			}).decision,
		).toBe("allow");
	});
});
