#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readStdin } from './_lib.mjs';

const TARGETS = [
  ['CLAUDE.md', 150],
  ['.claude/CLAUDE.md', 150],
  ['MEMORY.md', 200],
  ['.claude/memory/MEMORY.md', 200],
];

const EXPECTED_DENY = new Set(['Agent(Explore)', 'Agent(Plan)', 'Agent(general-purpose)']);

function fileLineBudgetWarning(baseDir, relPath, limit) {
  const fullPath = join(baseDir, relPath);
  if (!existsSync(fullPath)) return null;
  try {
    const lines = readFileSync(fullPath, 'utf8').split('\n').length - 1;
    if (lines > limit) {
      return `[budget] ${relPath}: ${lines} lines (target ${limit}). Compact this file to reduce per-turn token cost.`;
    }
  } catch {
    // ignore unreadable files
  }
  return null;
}

function collectLineBudgetWarnings(baseDir) {
  return TARGETS.map(([relPath, limit]) => fileLineBudgetWarning(baseDir, relPath, limit)).filter(Boolean);
}

function checkPermissionsDeny(projectDir) {
  const settingsPath = join(projectDir, '.claude', 'settings.json');
  if (!existsSync(settingsPath)) return null;
  try {
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    const denyList = new Set(settings?.permissions?.deny ?? []);
    const missing = [...EXPECTED_DENY].filter(e => !denyList.has(e));
    if (missing.length > 0) {
      const missingJson = missing.sort().map(m => `"${m}"`).join(', ');
      const fullDeny = [...EXPECTED_DENY].sort().map(d => `"${d}"`).join(', ');
      return (
        `[permissions] Missing permissions.deny entries: ${missingJson}. ` +
        'Built-in subagents (Explore, Plan, general-purpose) should be denied ' +
        'so custom agents are used instead. Add to .claude/settings.json: ' +
        `"permissions": {"deny": [${fullDeny}]}`
      );
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

const data = readStdin();
if (!data) process.exit(0);

const projectDir = data.cwd ?? process.cwd();
const warnings = collectLineBudgetWarnings(projectDir);

const denyWarning = checkPermissionsDeny(projectDir);
if (denyWarning) warnings.push(denyWarning);

if (warnings.length > 0) {
  process.stdout.write(warnings.join('\n') + '\n');
}
process.exit(0);
