#!/usr/bin/env node
const command = process.argv.slice(2).join(" ");
const ok = command.startsWith("rtk ");
const efficientSearch = /^rtk (grep|find)\b/.test(command);
console.log(JSON.stringify({ ok, efficientSearch, command }));
process.exit(ok ? 0 : 2);
