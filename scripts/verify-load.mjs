import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ROOT, setup, PRESETS } from '../lib/workbench.mjs';

if (!process.env.COOKING_PI_LOAD_CHILD) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cooking-pi-load-'));
  try {
    fs.mkdirSync(path.join(temp, 'home'));
    const report = spawnSync(process.execPath, ['--import', path.join(ROOT, 'tests/fixtures/no-network.mjs'), fileURLToPath(import.meta.url)], {
      encoding: 'utf8', timeout: 120000,
      env: { PATH: process.env.PATH, HOME: path.join(temp, 'home'), LANG: 'C.UTF-8', PI_OFFLINE: '1', PI_TELEMETRY: '0', PI_TITLE_OFF: '1', COOKING_PI_LOAD_CHILD: temp, COOKING_PI_NETWORK_LOG: path.join(temp, 'network.log') },
    });
    process.stdout.write(report.stdout || '');
    process.stderr.write(report.stderr || '');
    assert.equal(report.status, 0, report.error?.message || 'Resource verification failed');
    assert.equal(fs.existsSync(path.join(temp, 'network.log')), false, 'Unexpected network attempt');
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
} else {
  const { DefaultResourceLoader, ExtensionRunner } = await import('@earendil-works/pi-coding-agent');
  const results = [];
  for (const preset of PRESETS) {
    const agentDir = path.join(process.env.COOKING_PI_LOAD_CHILD, preset);
    const cwd = path.join(process.env.COOKING_PI_LOAD_CHILD, 'workspace');
    fs.mkdirSync(cwd, { recursive: true });
    setup({ preset, agentDir, env: {} });
    process.env.PI_CODING_AGENT_DIR = agentDir;
    const loader = new DefaultResourceLoader({ cwd, agentDir, noContextFiles: true, noSkills: true });
    await loader.reload();
    const result = loader.getExtensions();
    assert.deepEqual(result.errors, [], `${preset} errors`);
    assert.deepEqual(result.warnings ?? [], [], `${preset} warnings`);
    assert.deepEqual(loader.getThemes().diagnostics, [], `${preset} themes`);
    const commands = ExtensionRunner.prototype.resolveRegisteredCommands.call({ extensions: result.extensions });
    const expected = { minimal: 0, recommended: 5, personal: 14 }[preset];
    assert.equal(result.extensions.length, expected, `${preset} extension count`);
    if (preset !== 'minimal') {
      const clear = commands.filter(c => c.name === 'clear');
      assert.equal(clear.length, 1);
      assert.equal(clear[0].invocationName, 'clear');
      assert.equal(commands.filter(c => c.name === 'context').length, 1);
      assert.equal(commands.filter(c => c.name === 'pm').length, 1);
    }
    results.push({ preset, extensions: result.extensions.length, errors: 0, warnings: 0, themeDiagnostics: 0 });
  }
  const undo = fs.readFileSync(path.join(ROOT, 'node_modules/pi-undo-redo/src/extension.ts'), 'utf8');
  assert.match(undo, /event\.messageType === "custom"/);
  console.log(JSON.stringify({ host: '1.2.0', presets: results, undoCustomRunFix: true, providerRequests: 0 }, null, 2));
}
