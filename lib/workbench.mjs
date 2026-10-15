import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PRESETS = ['minimal', 'recommended', 'personal'];
const STATE = '.cooking-pi.json';
const MANAGED = new Set(['settings.json', 'keybindings.json', 'pi-cc-extensions.json', 'pi-hud.json', 'pi-goal.json', 'web-search.json', 'models.json']);
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
export const manifest = readJson(path.join(ROOT, 'package.json'));

function canonical(file) {
  let ancestor = path.resolve(file);
  const tail = [];
  while (!fs.existsSync(ancestor)) {
    tail.unshift(path.basename(ancestor));
    const parent = path.dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }
  return path.join(fs.realpathSync(ancestor), ...tail);
}

export function resolveAgentDir({ preset = 'recommended', agentDir, env = process.env } = {}) {
  if (!PRESETS.includes(preset)) throw new Error(`Unknown preset: ${preset}. Choose ${PRESETS.join(', ')}.`);
  const base = env.COOKING_PI_HOME || path.join(env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'cooking-pi');
  const target = path.resolve(agentDir || path.join(base, preset));
  const native = canonical(path.join(os.homedir(), '.pi', 'agent'));
  if (canonical(target) === native || canonical(target).startsWith(`${native}${path.sep}`)) {
    throw new Error('Choose a dedicated directory. cooking-pi does not manage your existing ~/.pi/agent.');
  }
  if (canonical(target) === canonical(ROOT)) throw new Error('The repository root cannot be an agent directory.');
  return target;
}

function regularFile(file) {
  if (!fs.existsSync(file)) {
    // existsSync follows links, so a dangling link still needs rejecting.
    try { if (fs.lstatSync(file).isSymbolicLink()) throw new Error(`Refusing symbolic link: ${file}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    return null;
  }
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Expected a regular file: ${file}`);
  return fs.readFileSync(file);
}

function readState(agentDir) {
  const bytes = regularFile(path.join(agentDir, STATE));
  if (!bytes) return null;
  const state = JSON.parse(bytes);
  if (state.schema !== 1 || !PRESETS.includes(state.preset) || typeof state.files !== 'object' || !state.files) {
    throw new Error('Invalid cooking-pi installation record. No files were changed.');
  }
  for (const [name, entry] of Object.entries(state.files)) {
    if (!MANAGED.has(name) || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error('Invalid managed file record.');
    if (entry.original && !/^\.cooking-pi-backups\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+\.json$/.test(entry.original)) {
      throw new Error('Invalid backup path in installation record.');
    }
  }
  return state;
}

function endpoint(value, variable) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${variable} must be an absolute URL.`); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error(`${variable} must be an HTTP(S) endpoint without credentials, query or fragment.`);
  }
  return value.replace(/\/$/, '');
}

export function desiredFiles({ preset = 'recommended', env = process.env } = {}) {
  const recipe = readJson(path.join(ROOT, 'presets', `${preset}.json`));
  const settings = structuredClone(recipe.settings);
  settings.packages = recipe.packages.map(name => name === 'cooking-pi' ? ROOT : path.join(ROOT, 'node_modules', name));
  const files = { 'settings.json': json(settings) };
  if (preset !== 'minimal') {
    files['keybindings.json'] = json({ 'app.model.select': 'ctrl+alt+l', 'app.tree.filter.labeledOnly': 'ctrl+shift+l' });
    files['pi-cc-extensions.json'] = json({ enableAliases: false, enableCustomFooter: false, showStartupHeader: false, enableSubagentAutocomplete: false });
    files['pi-hud.json'] = json({ version: 1, costUnit: '$', quota: { enabled: false, profiles: [] } });
  }
  if (preset === 'personal') {
    settings.extensions = [path.join(ROOT, 'extensions', 'selected-models.ts')];
    files['settings.json'] = json(settings);
    files['pi-goal.json'] = json({ continuationLimits: { automaticTurns: 60, noProgressTurns: 3 } });
    files['web-search.json'] = json({ workflow: 'auto-summary', summaryGenerationDeadlineMs: 60000 });
    const providers = { 'openai-codex': { modelOverrides: { 'gpt-6.1-sol': { contextWindow: 475000 } } } };
    for (const item of readJson(path.join(ROOT, 'examples', 'provider-catalog.json')).providers) {
      if (env[item.baseUrlEnv]) providers[item.id] = { ...item.config, baseUrl: endpoint(env[item.baseUrlEnv], item.baseUrlEnv) };
    }
    files['models.json'] = json({ providers });
  }
  return files;
}

export function plan(options = {}) {
  const preset = options.preset || 'recommended';
  const agentDir = resolveAgentDir({ ...options, preset });
  const previous = readState(agentDir);
  if (previous && previous.preset !== preset) throw new Error('This directory belongs to another preset. Use its own directory or uninstall its managed configuration first.');
  const files = desiredFiles({ ...options, preset });
  const entries = Object.entries(files).map(([name, content]) => {
    const old = regularFile(path.join(agentDir, name));
    const sha256 = digest(content);
    const oldHash = old ? digest(old) : null;
    const record = previous?.files[name];
    const action = oldHash === sha256 ? 'unchanged' : !old ? 'create' : record?.sha256 === oldHash ? 'update' : 'conflict';
    return { name, content, sha256, oldHash, action };
  });
  return { schema: 1, version: manifest.version, preset, agentDir, previous, entries };
}

export function summarizePlan(result) {
  return { preset: result.preset, agentDir: result.agentDir, version: result.version,
    files: result.entries.map(({ name, action, sha256 }) => ({ name, action, sha256 })) };
}

function ensureDirectory(directory) {
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (!fs.statSync(directory).isDirectory()) throw new Error(`Not a directory: ${directory}`);
}

function backupDirectory(agentDir, transaction) {
  for (const directory of [path.join(agentDir, '.cooking-pi-backups'), path.join(agentDir, '.cooking-pi-backups', transaction)]) {
    try { if (fs.lstatSync(directory).isSymbolicLink()) throw new Error('Refusing symbolic link in backup directory.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    ensureDirectory(directory);
  }
}

function atomicWrite(file, bytes) {
  regularFile(file);
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temp, bytes, { mode: 0o600, flag: 'wx' });
    fs.renameSync(temp, file);
  } finally { fs.rmSync(temp, { force: true }); }
}

export function setup(options = {}) {
  const result = plan(options);
  const conflicts = result.entries.filter(entry => entry.action === 'conflict');
  if (conflicts.length && !options.replace) throw new Error(`Existing configuration differs: ${conflicts.map(x => x.name).join(', ')}. Review plan; --replace backs up these files before replacing them.`);
  // Check all dependencies before writing any configuration.
  for (const file of [path.join(ROOT, 'node_modules', '@earendil-works', 'pi-coding-agent', 'package.json'),
    ...readJson(path.join(ROOT, 'presets', `${result.preset}.json`)).packages.filter(n => n !== 'cooking-pi').map(n => path.join(ROOT, 'node_modules', n, 'package.json'))]) {
    if (!fs.existsSync(file)) throw new Error('Dependencies are missing. Run npm ci --ignore-scripts first.');
  }
  ensureDirectory(result.agentDir);
  const transaction = crypto.randomUUID();
  const next = { schema: 1, version: manifest.version, preset: result.preset, repoRoot: ROOT, files: {} };
  for (const entry of result.entries) {
    // Detect edits between plan and write, including an unexpected new file.
    const current = regularFile(path.join(result.agentDir, entry.name));
    if ((current ? digest(current) : null) !== entry.oldHash) throw new Error(`Configuration changed during setup: ${entry.name}. Rerun plan.`);
    const prior = result.previous?.files[entry.name];
    let original = prior?.original || null;
    let owned = prior?.owned ?? !current;
    if (current && entry.action !== 'unchanged') {
      const backup = `.cooking-pi-backups/${transaction}/${entry.name}`;
      backupDirectory(result.agentDir, transaction);
      atomicWrite(path.join(result.agentDir, backup), current);
      // Keep the first original so uninstall restores the pre-installation file.
      if (!prior || !prior.owned) original ||= backup;
      owned = true;
    }
    if (entry.action !== 'unchanged') atomicWrite(path.join(result.agentDir, entry.name), entry.content);
    next.files[entry.name] = { sha256: entry.sha256, owned, original };
  }
  atomicWrite(path.join(result.agentDir, STATE), json(next));
  return summarizePlan(result);
}

export function uninstall(options = {}) {
  const agentDir = resolveAgentDir(options);
  const state = readState(agentDir);
  if (!state) throw new Error('No cooking-pi installation record found. No files were changed.');
  const changes = [];
  for (const [name, record] of Object.entries(state.files)) {
    const current = regularFile(path.join(agentDir, name));
    if (!record.owned) { changes.push({ name, action: 'keep-preexisting' }); continue; }
    if (current && digest(current) !== record.sha256) { changes.push({ name, action: 'keep-modified' }); continue; }
    let original;
    if (record.original) {
      // No symlink in the backup path may redirect an uninstall read.
      for (const partial of ['.cooking-pi-backups', path.dirname(record.original), record.original]) {
        if (fs.lstatSync(path.join(agentDir, partial)).isSymbolicLink()) throw new Error('Refusing symbolic link in backup path.');
      }
      original = regularFile(path.join(agentDir, record.original));
      if (!original) throw new Error(`Missing original backup for ${name}. No restore attempted.`);
    }
    changes.push({ name, action: original ? 'restore' : 'remove', original });
  }
  if (options.dryRun) return { agentDir, files: changes.map(({ name, action }) => ({ name, action })) };
  for (const change of changes) {
    if (change.action === 'restore') atomicWrite(path.join(agentDir, change.name), change.original);
    if (change.action === 'remove') fs.rmSync(path.join(agentDir, change.name), { force: true });
  }
  fs.rmSync(path.join(agentDir, STATE));
  return { agentDir, files: changes.map(({ name, action }) => ({ name, action })), retained: ['credentials', 'sessions', 'backups', 'modified files'] };
}

export function launchSpec(options = {}, args = []) {
  const preset = options.preset || 'recommended';
  const agentDir = resolveAgentDir({ ...options, preset });
  const state = readState(agentDir);
  if (!state || state.preset !== preset) throw new Error('Run cooking-pi setup for this preset and directory first.');
  if (state.repoRoot !== ROOT) throw new Error('This checkout moved. Review cooking-pi plan, then run setup --replace to refresh paths.');
  const env = { ...(options.env || process.env), PI_CODING_AGENT_DIR: agentDir };
  // These belong to this workbench, rather than an inherited native Pi session.
  delete env.PI_HUD_CONFIG;
  delete env.PI_CODING_AGENT_SESSION_DIR;
  delete env.PI_PACKAGE_DIR;
  if (preset !== 'minimal') env.PI_PROVIDER_MODEL_PICKER_SHORTCUT ??= 'ctrl+l';
  if (env.HERDR_PANE_ID) env.POWERLINE_NERD_FONTS ??= '1';
  const host = readJson(path.join(ROOT, 'node_modules', '@earendil-works', 'pi-coding-agent', 'package.json'));
  const relativeBin = typeof host.bin === 'string' ? host.bin : host.bin.pi;
  return { command: process.execPath, args: [path.join(ROOT, 'node_modules', '@earendil-works', 'pi-coding-agent', relativeBin), ...args], env };
}

export async function run(options = {}, args = []) {
  const spec = launchSpec(options, args);
  const child = spawn(spec.command, spec.args, { env: spec.env, stdio: 'inherit', cwd: process.cwd() });
  const forward = signal => { if (!child.killed) child.kill(signal); };
  const interrupt = () => forward('SIGINT');
  const terminate = () => forward('SIGTERM');
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', terminate);
  try {
    return await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) => resolve(code ?? (signal === 'SIGINT' ? 130 : 1)));
    });
  } finally { process.off('SIGINT', interrupt); process.off('SIGTERM', terminate); }
}

export function doctor(options = {}) {
  const agentDir = resolveAgentDir(options);
  const state = readState(agentDir);
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail });
  const version = process.versions.node.split('.').map(Number);
  add('node', version[0] > 22 || (version[0] === 22 && version[1] >= 19), process.versions.node);
  const lock = readJson(path.join(ROOT, 'package-lock.json'));
  for (const name of ['@earendil-works/pi-coding-agent', ...Object.keys(manifest.dependencies)]) {
    const installed = path.join(ROOT, 'node_modules', name, 'package.json');
    const expected = name === '@cooking-pi/hud-snapshot' ? '0.2.1-cooking.20261015' : lock.packages[`node_modules/${name}`]?.version;
    add(name, fs.existsSync(installed) && readJson(installed).version === expected, `expected ${expected}`);
  }
  add('configuration', Boolean(state), state ? state.preset : 'run setup');
  if (state) {
    add('checkout-path', state.repoRoot === ROOT, 'regenerate configuration after moving the checkout');
    for (const name of Object.keys(state.files)) {
      try { const bytes = regularFile(path.join(agentDir, name)); if (bytes) JSON.parse(bytes); add(name, Boolean(bytes), 'JSON syntax; custom edits are allowed'); }
      catch { add(name, false, 'missing or invalid JSON'); }
    }
  }
  return { ok: checks.every(check => check.ok), agentDir, checks, notes: ['No provider requests were sent.', 'Authentication and remote service availability require a separate live check.'] };
}
