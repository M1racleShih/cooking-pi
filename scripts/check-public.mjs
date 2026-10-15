import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { ROOT, manifest } from '../lib/workbench.mjs';

const allowedRoots = new Set(['.github', 'assets', 'bin', 'docs', 'examples', 'extensions', 'lib', 'licenses', 'packages', 'presets', 'scripts', 'tests', 'themes']);
const allowedFiles = new Set(['.env.example', '.gitignore', '.npmrc', '.nvmrc', 'AGENTS.md', 'README.md', 'README.en.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CHANGELOG.md', 'package.json', 'package-lock.json']);
const ignored = new Set(['.git', '.local', 'node_modules', 'artifacts', '__pycache__']);
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    assert(!entry.isSymbolicLink(), `Public source symlink requires review: ${file}`);
    if (entry.isDirectory()) walk(file);
    else files.push(file);
  }
}
for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (ignored.has(entry.name)) continue;
  assert(entry.isDirectory() ? allowedRoots.has(entry.name) : allowedFiles.has(entry.name), `Unexpected public root entry: ${entry.name}`);
}
walk(ROOT);
const patterns = [
  /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /\/home\/[a-zA-Z0-9_-]+\//,
];
for (const file of files) {
  const relative = path.relative(ROOT, file);
  assert(!['auth.json', 'trust.json', 'mcp-cache.json', 'models-store.json'].includes(path.basename(file)), `Private state file: ${relative}`);
  if (file.endsWith('.png')) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of patterns) assert(!pattern.test(text), `Review potential private material in ${relative}`);
  if (file.endsWith('.md')) {
    for (const match of text.matchAll(/\]\(([^\s)]+)(?:\s+[^)]*)?\)/g)) {
      const target = match[1].split('#')[0];
      if (!target || /^(?:https?:|mailto:)/.test(target)) continue;
      assert(fs.existsSync(path.resolve(path.dirname(file), decodeURIComponent(target))), `Broken local link in ${relative}: ${target}`);
    }
  }
}
const origin = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages/pi-hud-snapshot/ORIGIN.json')));
const snapshot = files.filter(file => file.startsWith(path.join(ROOT, 'packages/pi-hud-snapshot', path.sep)) && file.endsWith('.ts'));
assert.equal(snapshot.length, Object.keys(origin.files).length, 'HUD runtime file set changed');
for (const file of snapshot) {
  const relative = path.relative(path.join(ROOT, 'packages/pi-hud-snapshot'), file).split(path.sep).join('/');
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), origin.files[relative], `HUD source hash changed: ${relative}`);
}
for (const source of Object.values({ ...manifest.dependencies, ...manifest.devDependencies })) {
  assert(/^(?:\d+\.\d+\.\d+(?:-[\w.]+)?|file:packages\/pi-hud-snapshot|https:\/\/codeload\.github\.com\/[\w-]+\/[\w-]+\/tar\.gz\/[a-f0-9]{40})$/.test(source), `Unpinned dependency: ${source}`);
}
console.log(`Public-source check passed: ${files.length} files; local links, pinned sources and ${snapshot.length} HUD runtime hashes verified.`);
console.log('Pattern checks cover common token/key formats and local home paths; manually review the complete release diff as well.');
