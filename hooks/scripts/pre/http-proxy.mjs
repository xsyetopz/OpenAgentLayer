#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { deny, passthrough, readStdin } from '../_lib.mjs';

const TIMEOUT_SECONDS = '5';

const url = (process.env.CCA_HTTP_HOOK_URL ?? '').trim();
if (!url) passthrough();

const data = readStdin();
if (!data) passthrough();

const token = (process.env.CCA_HTTP_HOOK_TOKEN ?? '').trim();
const failClosed = (process.env.CCA_HTTP_HOOK_FAIL_CLOSED ?? '').trim() === '1';

const body = JSON.stringify(data);

const curlArgs = [
  '-s',
  '-X', 'POST',
  '-H', 'Content-Type: application/json',
  '--max-time', TIMEOUT_SECONDS,
  '--write-out', '\n%{http_code}',
  '--data', body,
];
if (token) {
  curlArgs.push('-H', `Authorization: Bearer ${token}`);
}
curlArgs.push(url);

try {
  const output = execFileSync('curl', curlArgs, { encoding: 'utf8' });
  const lines = output.trimEnd().split('\n');
  const statusCode = parseInt(lines[lines.length - 1], 10);
  const respBody = lines.slice(0, -1).join('\n').trim();

  if (statusCode === 204) passthrough();

  if (!respBody) passthrough();

  let result;
  try {
    result = JSON.parse(respBody);
  } catch {
    passthrough();
  }

  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(0);
} catch {
  if (failClosed) {
    deny('[http-hook] Enterprise DLP server unreachable and CCA_HTTP_HOOK_FAIL_CLOSED=1. Blocking action.');
  }
  passthrough();
}
