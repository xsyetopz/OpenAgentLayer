#!/usr/bin/env node
import { auditLog, passthrough, readStdin } from './_lib.mjs';

const data = readStdin();
const message = data.message ?? data.notification ?? '';

auditLog(
  'Notification',
  'notification.mjs',
  'notified',
  message ? String(message).slice(0, 200) : 'empty'
);
passthrough();
