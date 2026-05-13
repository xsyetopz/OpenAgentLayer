#!/usr/bin/env node

import { evaluateCommandSafety } from "./_command-safety.mjs";
import { createHookRunner } from "./_runtime.mjs";

createHookRunner("block-command-safety", evaluateCommandSafety);
