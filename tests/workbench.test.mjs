import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, plan, setup, summarizePlan, uninstall, launchSpec, desiredFiles, resolveAgentDir, doctor } from '../lib/workbench.mjs';

function fixture(t, extra = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cooking-pi-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { agentDir: path.join(root, 'agent'), env: {}, ...extra };
}

test('plan is read-only, including when its target does not exist', t => {
  const options = fixture(t);
  const result = plan(options);
  assert(result.entries.every(e => e.action === 'create'));
  assert.equal(fs.existsSync(options.agentDir), false);
  assert.equal(JSON.stringify(summarizePlan(result)).includes('content'), false);
});

test('setup is idempotent and creates private config files', t => {
  const options = fixture(t);
  setup(options);
  assert(plan(options).entries.every(e => e.action === 'unchanged'));
  const before = fs.readFileSync(path.join(options.agentDir, 'settings.json'));
  setup(options);
  assert.deepEqual(fs.readFileSync(path.join(options.agentDir, 'settings.json')), before);
  if (process.platform !== 'win32') {
    assert.equal(fs.statSync(options.agentDir).mode & 0o777, 0o700);
    assert.equal(fs.statSync(path.join(options.agentDir, 'settings.json')).mode & 0o777, 0o600);
  }
});

test('conflicts fail before writing any managed files', t => {
  const options = fixture(t);
  fs.mkdirSync(options.agentDir);
  fs.writeFileSync(path.join(options.agentDir, 'settings.json'), '{"custom":true}\n');
  assert.throws(() => setup(options), /Existing configuration differs/);
  assert.deepEqual(fs.readdirSync(options.agentDir), ['settings.json']);
  assert.equal(fs.readFileSync(path.join(options.agentDir, 'settings.json'), 'utf8'), '{"custom":true}\n');
});

test('replace backs up originals; uninstall restores them and keeps credentials and sessions', t => {
  const options = fixture(t);
  fs.mkdirSync(options.agentDir);
  const original = '{"custom":true}\n';
  fs.writeFileSync(path.join(options.agentDir, 'settings.json'), original);
  setup({ ...options, replace: true });
  fs.writeFileSync(path.join(options.agentDir, 'auth.json'), '{"synthetic":"private"}');
  fs.mkdirSync(path.join(options.agentDir, 'sessions'));
  fs.writeFileSync(path.join(options.agentDir, 'sessions', 'example.jsonl'), 'synthetic session');
  const preview = uninstall({ ...options, dryRun: true });
  assert.equal(preview.files.find(f => f.name === 'settings.json').action, 'restore');
  assert(fs.existsSync(path.join(options.agentDir, 'pi-hud.json')));
  uninstall(options);
  assert.equal(fs.readFileSync(path.join(options.agentDir, 'settings.json'), 'utf8'), original);
  assert(fs.existsSync(path.join(options.agentDir, 'auth.json')));
  assert(fs.existsSync(path.join(options.agentDir, 'sessions', 'example.jsonl')));
  assert(fs.existsSync(path.join(options.agentDir, '.cooking-pi-backups')));
});

test('uninstall keeps later manual changes', t => {
  const options = fixture(t);
  setup(options);
  fs.writeFileSync(path.join(options.agentDir, 'settings.json'), '{"laterEdit":true}');
  const result = uninstall(options);
  assert.equal(result.files.find(f => f.name === 'settings.json').action, 'keep-modified');
  assert.equal(fs.readFileSync(path.join(options.agentDir, 'settings.json'), 'utf8'), '{"laterEdit":true}');
});

test('preexisting identical configuration is not deleted on uninstall', t => {
  const options = fixture(t);
  fs.mkdirSync(options.agentDir);
  const files = desiredFiles();
  fs.writeFileSync(path.join(options.agentDir, 'keybindings.json'), files['keybindings.json']);
  setup(options);
  uninstall(options);
  assert.equal(fs.readFileSync(path.join(options.agentDir, 'keybindings.json'), 'utf8'), files['keybindings.json']);
});

test('live and dangling symlinks cannot redirect config writes', t => {
  for (const dangling of [false, true]) {
    const options = fixture(t);
    fs.mkdirSync(options.agentDir);
    const other = path.join(path.dirname(options.agentDir), 'outside.json');
    if (!dangling) fs.writeFileSync(other, 'untouched');
    fs.symlinkSync(other, path.join(options.agentDir, 'settings.json'));
    assert.throws(() => setup({ ...options, replace: true }), /regular file|symbolic link/);
    assert.equal(fs.existsSync(other), !dangling);
    if (!dangling) assert.equal(fs.readFileSync(other, 'utf8'), 'untouched');
  }
});

test('a backup directory symlink is rejected', t => {
  const options = fixture(t);
  fs.mkdirSync(options.agentDir);
  const other = path.join(path.dirname(options.agentDir), 'outside');
  fs.mkdirSync(other);
  fs.writeFileSync(path.join(options.agentDir, 'settings.json'), '{}');
  fs.symlinkSync(other, path.join(options.agentDir, '.cooking-pi-backups'));
  assert.throws(() => setup({ ...options, replace: true }), /symbolic link/);
  assert.deepEqual(fs.readdirSync(other), []);
  assert.equal(fs.readFileSync(path.join(options.agentDir, 'settings.json'), 'utf8'), '{}');
});

test('invalid installation records cannot escape their directory', t => {
  const options = fixture(t);
  setup(options);
  const record = path.join(options.agentDir, '.cooking-pi.json');
  const state = JSON.parse(fs.readFileSync(record));
  state.files['settings.json'].original = '../outside.json';
  fs.writeFileSync(record, JSON.stringify(state));
  assert.throws(() => uninstall(options), /Invalid backup path/);
  assert(fs.existsSync(path.join(options.agentDir, 'settings.json')));
});

test('a different preset cannot silently reuse the same directory', t => {
  const options = fixture(t);
  setup(options);
  assert.throws(() => setup({ ...options, preset: 'personal' }), /another preset/);
});

test('native Pi directory and aliases to it are refused', t => {
  const native = path.join(os.homedir(), '.pi', 'agent');
  assert.throws(() => resolveAgentDir({ agentDir: native }), /existing/);
  assert.throws(() => resolveAgentDir({ agentDir: path.join(native, 'child') }), /existing/);
  if (fs.existsSync(native)) {
    const options = fixture(t);
    fs.symlinkSync(native, options.agentDir);
    assert.throws(() => resolveAgentDir(options), /existing/);
  }
});

test('provider setup records a key reference, never its value', () => {
  const secret = `synthetic-${Date.now()}-not-a-real-credential`;
  const files = desiredFiles({ preset: 'personal', env: { NEWAPI_BASE_URL: 'https://relay.example/v1', NEWAPI_API_KEY: secret } });
  const models = JSON.parse(files['models.json']);
  assert.equal(models.providers.newapi.baseUrl, 'https://relay.example/v1');
  assert.equal(models.providers.newapi.apiKey, '$NEWAPI_API_KEY');
  assert.equal(JSON.stringify(files).includes(secret), false);
  assert.equal(models.providers['qwen-local'], undefined);
  assert.throws(() => desiredFiles({ preset: 'personal', env: { NEWAPI_BASE_URL: 'https://user:pass@example.com/v1' } }), /without credentials/);
});

test('recommended preset has no quota profiles or model credentials', () => {
  const files = desiredFiles({ preset: 'recommended', env: {} });
  assert.deepEqual(JSON.parse(files['pi-hud.json']).quota, { enabled: false, profiles: [] });
  assert.equal(files['models.json'], undefined);
  assert.equal(files['auth.json'], undefined);
});

test('launcher preserves cwd and passes arguments literally through an isolated environment', t => {
  const options = fixture(t);
  setup(options);
  const cwd = process.cwd();
  const args = ['--name', 'literal; $(echo unsafe)'];
  const spec = launchSpec({ ...options, env: { PATH: process.env.PATH, PI_CODING_AGENT_DIR: 'native', PI_CODING_AGENT_SESSION_DIR: 'native-sessions', PI_PACKAGE_DIR: 'native-package', PI_HUD_CONFIG: 'native-hud', HERDR_PANE_ID: 'fixture' } }, args);
  assert.equal(spec.env.PI_CODING_AGENT_DIR, options.agentDir);
  assert.equal(spec.env.PI_HUD_CONFIG, undefined);
  assert.equal(spec.env.PI_CODING_AGENT_SESSION_DIR, undefined);
  assert.equal(spec.env.PI_PACKAGE_DIR, undefined);
  assert.equal(spec.env.PI_PROVIDER_MODEL_PICKER_SHORTCUT, 'ctrl+l');
  assert.equal(spec.env.POWERLINE_NERD_FONTS, '1');
  assert.deepEqual(spec.args.slice(-2), args);
  assert.equal(process.cwd(), cwd);
  const output = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'cooking-pi.mjs'), 'run', '--agent-dir', options.agentDir, '--', '--version'], { cwd: os.tmpdir(), encoding: 'utf8' });
  assert.equal(output.status, 0, output.stderr);
  assert.match(output.stdout, /1\.2\.0/);
});

test('doctor verifies installed versions without provider calls', t => {
  const options = fixture(t);
  setup(options);
  const report = doctor(options);
  assert.equal(report.ok, true, JSON.stringify(report));
  assert.match(report.notes.join(' '), /No provider requests/);
});

test('CLI rejects missing values and does not mistake Pi options for setup flags', () => {
  for (const args of [['plan', '--agent-dir'], ['setup', '--preset', '--replace'], ['run', '--offline'], ['run', '--dry-run'], ['plan', '--replace']]) {
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'cooking-pi.mjs'), ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Missing value|Pass Pi options|applies only/);
  }
});
