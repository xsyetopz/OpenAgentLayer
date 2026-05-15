#!/usr/bin/env node
const event = process.argv[2] ?? "PreToolUse";
console.log(JSON.stringify({ event, tool: "fixture", ok: true }));
