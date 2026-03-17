/**
 * Suppress stderr at the OS file descriptor level.
 *
 * Native modules or uncaught warnings can write directly to fd 2,
 * bypassing Node.js process.stderr. Claude Code interprets ANY
 * stderr output as hook failure ("JSON validation failed").
 *
 * This module MUST be the first import in every hook entry point.
 * ESM evaluates imports depth-first in declaration order, so importing
 * this module first ensures fd 2 is redirected before anything else runs.
 *
 * Adapted from context-mode plugin (github.com/mksglu/context-mode).
 */
import { closeSync, openSync } from "node:fs";
import { devNull } from "node:os";

try {
	closeSync(2);
	openSync(devNull, "w"); // acquires fd 2 (lowest available)
} catch {
	process.stderr.write = /** @type {any} */ (() => true);
}
