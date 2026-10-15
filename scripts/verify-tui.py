#!/usr/bin/env python3
"""Run real Pi PTYs with disposable config, an in-process model, and no network."""
import errno
import fcntl
import json
import os
from pathlib import Path
import pty
import re
import select
import signal
import struct
import subprocess
import tempfile
import termios
import time

ROOT = Path(__file__).resolve().parents[1]
CLI = ROOT / 'bin/cooking-pi.mjs'
ARTIFACTS = ROOT / '.local/verification'
ARTIFACTS.mkdir(parents=True, exist_ok=True)
NODE = os.environ.get('COOKING_PI_NODE', 'node')
ANSI = re.compile(r'\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07]*(?:\x07|\x1b\\)|\x1b_[^\x1b]*\x1b\\|\x1b[()][0-9A-B]|\x1b[<>"][a-zA-Z]')
results = []

with tempfile.TemporaryDirectory(prefix='cooking-pi-tui-') as temp:
    base = Path(temp)
    (base / 'home').mkdir()
    env_base = {
        'PATH': os.environ['PATH'], 'HOME': str(base / 'home'), 'TERM': 'xterm-256color',
        'LANG': 'C.UTF-8', 'PI_OFFLINE': '1', 'PI_TELEMETRY': '0', 'PI_TITLE_OFF': '1',
        'NODE_OPTIONS': '--import=' + str(ROOT / 'tests/fixtures/no-network.mjs'),
        'COOKING_PI_NETWORK_LOG': str(base / 'network.log'),
        'XDG_CACHE_HOME': str(base / 'cache'), 'XDG_DATA_HOME': str(base / 'data'),
    }
    for preset in os.environ.get('COOKING_PI_TEST_PRESETS', 'minimal,recommended,personal').split(','):
        assert preset in ['minimal', 'recommended', 'personal']
        agent = base / preset
        subprocess.run([NODE, str(CLI), 'setup', '--preset', preset, '--agent-dir', str(agent)], env=env_base, check=True, capture_output=True)
        for mode in ['regular', 'fullscreen']:
            workspace = base / 'home' / f'{preset}-{mode}'
            workspace.mkdir()
            notes = workspace / 'notes.txt'
            notes.write_text('cooking-pi original\n')
            probe_file = base / f'{preset}-{mode}.json'
            env = {**env_base, 'COOKING_PI_PROBE': str(probe_file)}
            args = [NODE, str(CLI), 'run', '--preset', preset, '--agent-dir', str(agent), '--',
                    '--offline', '--no-approve', '--no-session', '--tui-mode', mode,
                    '--provider', 'cooking-fixture', '--model', 'fixture-alpha', '--thinking', 'medium',
                    '--name', 'cooking-pi demo', '-e', str(ROOT / 'tests/fixtures/provider.ts'),
                    '-e', str(ROOT / 'tests/fixtures/probe.ts')]
            pid, fd = pty.fork()
            if pid == 0:
                os.chdir(workspace)
                os.execvpe(NODE, args, env)
            fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', 42, 120, 0, 0))
            complete = bytearray()
            recent = bytearray()
            def pump(duration):
                deadline = time.monotonic() + duration
                while time.monotonic() < deadline:
                    ready, _, _ = select.select([fd], [], [], min(0.1, max(0, deadline - time.monotonic())))
                    if not ready:
                        continue
                    try:
                        data = os.read(fd, 65536)
                    except OSError as error:
                        if error.errno == errno.EIO:
                            raise RuntimeError('Pi exited unexpectedly') from error
                        raise
                    if not data:
                        raise RuntimeError('Pi PTY closed unexpectedly')
                    complete.extend(data)
                    recent.extend(data)
            def plain():
                return ANSI.sub('', recent.decode('utf8', 'replace'))
            def wait(marker, timeout=25):
                deadline = time.monotonic() + timeout
                while marker not in plain():
                    if time.monotonic() >= deadline:
                        raise RuntimeError(f'{preset}/{mode}: waiting for {marker!r}: {plain()[-1800:]}')
                    pump(0.1)
            def command(text, marker=None):
                recent.clear()
                # undo intentionally restores the undone prompt into the editor.
                # Clear that draft before entering the next command.
                os.write(fd, b'\x01\x0b' + text.encode('utf8') + b'\r')
                if marker:
                    wait(marker)
                pump(0.25)
            def check():
                command('/cooking-check', 'COOKING_CHECK_OK')
                value = json.loads(probe_file.read_text())
                assert value['model'] == 'fixture-alpha', value
                assert value['thinking'] == 'medium', value
                assert value['cwd'] == str(workspace), value
                return value
            try:
                pump(2)
                value = check()
                if preset != 'minimal':
                    assert value['editorInstalled'], value
                    assert len(value['clearCommands']) == 1, value
                    assert 'pi-cc-extensions' in value['writeOwner']['path'], value
                    assert 'hud' in value['commands'] and 'pm' in value['commands'], value
                    assert 'ctx(last)' in ANSI.sub('', complete.decode('utf8', 'replace'))
                command('ECHO:COOKING_HELLO', 'COOKING_HELLO')
                command('TOOL:read:notes.txt', 'COOKING_DONE')
                command('TOOL:write:notes.txt', 'COOKING_DONE')
                assert notes.read_text() == 'cooking-pi updated\n'
                command('TOOL:edit:notes.txt', 'COOKING_DONE')
                assert notes.read_text() == 'cooking-pi edited\n'
                checks = ['caller cwd', 'fixture model', 'read/write/edit']
                if preset == 'personal':
                    command('/undo', 'Undid message')
                    assert notes.read_text() == 'cooking-pi updated\n'
                    command('/cooking-custom', 'COOKING_READY')
                    command('/redo', 'Redid message')
                    assert notes.read_text() == 'cooking-pi edited\n'
                    checks += ['undo restores file', 'custom continuation preserves redo', 'redo restores file']
                if preset != 'minimal':
                    command('/context', 'Tools definition')
                    os.write(fd, b'\x1b')
                    pump(0.25)
                    # Exercise the actual Ctrl+L binding, not only command registration.
                    recent.clear()
                    os.write(fd, b'\x0c')
                    wait('Cooking Alpha')
                    os.write(fd, b'\x1b')
                    pump(0.25)
                    checks += ['block editor', 'HUD footer', 'CC tool ownership', 'context dialog', 'Ctrl+L model picker']
                command('/reload', 'Reloaded')
                value = check()
                if preset != 'minimal':
                    assert value['editorInstalled'] and 'pi-cc-extensions' in value['writeOwner']['path'], value
                    command('/clear', 'Cleared')
                    value = check()
                    assert len(value['clearCommands']) == 1
                    assert value['thinking'] == 'medium'
                    checks += ['clear retains model and thinking']
                command('ECHO:READY_AFTER_RELOAD', 'READY_AFTER_RELOAD')
                fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', 32, 90, 0, 0))
                os.kill(pid, signal.SIGWINCH)
                pump(0.4)
                check()
                fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', 42, 120, 0, 0))
                os.kill(pid, signal.SIGWINCH)
                pump(0.3)
                if preset == 'recommended' and mode == 'fullscreen':
                    command('ECHO:Ready to cook. Start small, keep the recipes you like.', 'Ready to cook.')
                    (ARTIFACTS / 'preview.ansi').write_bytes(complete)
                text = ANSI.sub('', complete.decode('utf8', 'replace'))
                assert 'checkpoint skipped' not in text.lower(), text[-1800:]
                assert 'failed to load extension' not in text.lower(), text[-1800:]
                results.append({'preset': preset, 'mode': mode, 'status': 'pass', 'checks': checks + ['reload', 'post-reload turn', 'resize']})
                print(json.dumps(results[-1]), flush=True)
            finally:
                (ARTIFACTS / f'{preset}-{mode}.ansi').write_bytes(complete)
                try:
                    os.kill(pid, signal.SIGTERM)
                    deadline = time.monotonic() + 3
                    while time.monotonic() < deadline:
                        done, _ = os.waitpid(pid, os.WNOHANG)
                        if done:
                            break
                        time.sleep(0.05)
                    else:
                        os.kill(pid, signal.SIGKILL)
                        os.waitpid(pid, 0)
                except ProcessLookupError:
                    pass
                os.close(fd)
    assert not (base / 'network.log').exists(), 'Unexpected outbound network attempt'

(ARTIFACTS / 'tui.json').write_text(json.dumps({'cases': results, 'providerRequests': 0}, indent=2) + '\n')
