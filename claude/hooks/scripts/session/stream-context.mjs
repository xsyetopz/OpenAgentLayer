#!/usr/bin/env node
/**
 * Stream Context — SessionStart hook (Layer 3)
 *
 * When CCA_STREAM_MODE=1, injects safety instructions into the LLM context
 * so it avoids outputting secrets in text responses. No-op otherwise.
 */
import "../suppress-stderr.mjs";
import { isStreamMode } from "../_env-loader.mjs";
import { passthrough, warn } from "../_lib.mjs";

const SAFETY_CONTEXT = [
	"STREAMING SAFETY MODE ACTIVE: The developer is live streaming.",
	"NEVER output secret values, API keys, tokens, passwords, or credentials in text responses.",
	"Reference env vars by name ($API_KEY) not by value. Use [REDACTED] as placeholder.",
	"When reading files that may contain secrets, summarize the structure without showing values.",
	'If you accidentally see a secret in tool output, do NOT repeat it. Say "[secret detected, not shown]".',
	"Do not echo or quote any string that looks like a key, token, password, or connection string.",
].join(" ");

try {
	if (!isStreamMode()) passthrough();
	warn(SAFETY_CONTEXT, "SessionStart");
} catch {
	passthrough();
}
