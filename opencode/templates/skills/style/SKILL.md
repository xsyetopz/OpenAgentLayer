---
name: style
description: Detects project code style conventions and injects them as context. Preloaded by @hephaestus.
compatibility: opencode
---
# Coding Style

Run this command to detect project conventions, then follow the detected style in all code you write:

```bash
node -e "
const fs = require('fs');
const path = require('path');
const exts = { py: '*.py', ts: '*.ts', js: '*.js', rs: '*.rs', go: '*.go' };
let files = [];
for (const [ext, pat] of Object.entries(exts)) {
  try {
    const found = require('child_process').execSync('find . -path ./node_modules -prune -o -name \"' + pat.split('/').pop() + '\" -print 2>/dev/null', { encoding: 'utf8' }).trim().split('\n').filter(Boolean).slice(0, 3);
    files.push(...found);
  } catch {}
}
if (!files.length) { console.log('No source files detected.'); process.exit(); }
let tabs = 0, spaces = 0, snake = 0, camel = 0, pascal = 0;
let semicolons = 0, singleQ = 0, doubleQ = 0;
for (const f of files) {
  try {
    const content = fs.readFileSync(f, 'utf8');
    tabs += (content.match(/\t/g) || []).length;
    spaces += (content.match(/^ {2,}/gm) || []).length;
    snake += (content.match(/\b[a-z]+_[a-z]+/g) || []).length;
    camel += (content.match(/\b[a-z]+[A-Z][a-z]+/g) || []).length;
    pascal += (content.match(/\b[A-Z][a-z]+[A-Z]/g) || []).length;
    semicolons += (content.match(/;/g) || []).length;
    singleQ += (content.match(/'/g) || []).length;
    doubleQ += (content.match(/\"/g) || []).length;
  } catch {}
}
const indent = tabs > spaces ? 'tabs' : 'spaces';
const naming = snake > camel ? 'snake_case' : 'camelCase';
const quotes = singleQ > doubleQ ? 'single' : 'double';
const langs = [...new Set(files.map(f => path.extname(f)))];
console.log('Indent: ' + indent + ' | Naming: ' + naming + ' | Quotes: ' + quotes);
console.log('Languages: ' + JSON.stringify(langs));
console.log('Sample: ' + files.slice(0, 5).join(' '));
"
```
