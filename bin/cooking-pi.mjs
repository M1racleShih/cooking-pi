#!/usr/bin/env node
import { plan, setup, summarizePlan, uninstall, run, doctor, PRESETS } from '../lib/workbench.mjs';

const help = `cooking-pi — reproducible Pi recipes\n\nUsage: cooking-pi <plan|setup|run|doctor|uninstall> [options] [-- Pi arguments]\n\n  --preset <name>       ${PRESETS.join(', ')} (default: recommended)\n  --agent-dir <path>    Use a dedicated configuration directory\n  --replace             Back up and replace conflicting managed files during setup\n  --dry-run             Preview uninstall; plan is always read-only\n  --json                Print machine-readable output (never credentials)\n\nExamples:\n  node bin/cooking-pi.mjs plan\n  node bin/cooking-pi.mjs setup\n  node bin/cooking-pi.mjs run -- --offline\n  node bin/cooking-pi.mjs uninstall --dry-run\n`;

async function main() {
  const argv = process.argv.slice(2);
  if (!argv.length || ['--help', '-h', 'help'].includes(argv[0])) { console.log(help); return 0; }
  const command = argv.shift();
  const options = {};
  let piArgs = [];
  while (argv.length) {
    const arg = argv.shift();
    if (arg === '--') { piArgs = argv; break; }
    if (arg === '--preset' || arg === '--agent-dir') {
      const value = argv.shift();
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}.`);
      options[arg === '--preset' ? 'preset' : 'agentDir'] = value;
    } else if (['--replace', '--json', '--dry-run'].includes(arg)) options[arg === '--dry-run' ? 'dryRun' : arg.slice(2)] = true;
    else throw new Error(`Unknown option: ${arg}. Pass Pi options after --.`);
  }
  if (command !== 'run' && piArgs.length) throw new Error('Pi arguments apply only to run.');
  if (options.replace && command !== 'setup') throw new Error('--replace applies only to setup.');
  if (options.dryRun && !['setup', 'uninstall', 'plan'].includes(command)) throw new Error('--dry-run applies only to setup, uninstall or plan.');
  if (options.json && command === 'run') throw new Error('--json applies to workbench inspection commands; pass Pi flags after --.');
  if (command === 'run') return run(options, piArgs);
  let result;
  if (command === 'plan') result = summarizePlan(plan(options));
  else if (command === 'setup') result = options.dryRun ? summarizePlan(plan(options)) : setup(options);
  else if (command === 'doctor') result = doctor(options);
  else if (command === 'uninstall') result = uninstall(options);
  else throw new Error(`Unknown command: ${command}.`);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else if (command === 'doctor') {
    for (const check of result.checks) console.log(`${check.ok ? 'OK' : 'FAIL'} ${check.name}: ${check.detail}`);
    console.log(result.notes.join('\n'));
  } else {
    console.log(`${command}: ${result.agentDir}`);
    for (const entry of result.files) console.log(`  ${entry.action.padEnd(16)} ${entry.name}`);
    if (command === 'setup' && !options.dryRun) console.log('Ready. Run cooking-pi run, then /login to authenticate your own provider.');
  }
  return command === 'doctor' && !result.ok ? 1 : 0;
}

try { process.exitCode = await main(); }
catch (error) { console.error(`cooking-pi: ${error.message}`); process.exitCode = 1; }
