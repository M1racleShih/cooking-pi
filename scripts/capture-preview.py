#!/usr/bin/env python3
"""Capture a real offline Pi demo. The optional renderer needs pyte and Pillow."""
import argparse
import errno
import fcntl
import json
import os
from pathlib import Path
import pty
import select
import signal
import struct
import subprocess
import tempfile
import termios
import time

parser = argparse.ArgumentParser()
parser.add_argument('--font', type=Path, required=True, help='Installed monospaced TTF/OTF; the font is not bundled')
args = parser.parse_args()
import pyte
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
cli = root / 'bin/cooking-pi.mjs'
output = root / '.local/preview'
output.mkdir(parents=True, exist_ok=True)
columns, rows = 110, 34
with tempfile.TemporaryDirectory(prefix='cooking-pi-preview-') as temporary:
    base = Path(temporary)
    workspace = base / 'home/project'
    workspace.mkdir(parents=True)
    (workspace / 'recipe.txt').write_text('A small recipe for a comfortable Pi.\n')
    env = {'PATH': os.environ['PATH'], 'HOME': str(base / 'home'), 'TERM': 'xterm-256color', 'COLORTERM': 'truecolor',
           'LANG': 'C.UTF-8', 'PI_OFFLINE': '1', 'PI_TELEMETRY': '0', 'PI_TITLE_OFF': '1',
           'NODE_OPTIONS': '--import=' + str(root / 'tests/fixtures/no-network.mjs'),
           'COOKING_PI_NETWORK_LOG': str(base / 'network.log')}
    subprocess.run(['node', str(cli), 'setup', '--agent-dir', str(base / 'agent')], env=env, check=True, capture_output=True)
    command = ['node', str(cli), 'run', '--agent-dir', str(base / 'agent'), '--', '--offline', '--no-approve', '--no-session',
               '--tui-mode', 'fullscreen', '--use-theme', 'catppuccin-frappe', '--provider', 'cooking-fixture',
               '--model', 'fixture-alpha', '--thinking', 'medium', '--name', 'cooking-pi demo', '-e', str(root / 'tests/fixtures/provider.ts')]
    pid, fd = pty.fork()
    if pid == 0:
        os.chdir(workspace)
        os.execvpe('node', command, env)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', rows, columns, 0, 0))
    data = bytearray()
    def pump(seconds):
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            ready, _, _ = select.select([fd], [], [], min(0.1, max(0, deadline - time.monotonic())))
            if ready:
                try:
                    chunk = os.read(fd, 65536)
                except OSError as error:
                    if error.errno == errno.EIO:
                        raise RuntimeError('Preview Pi process exited unexpectedly') from error
                    raise
                if not chunk:
                    raise RuntimeError('Preview PTY closed unexpectedly')
                data.extend(chunk)
    try:
        pump(3)
        (output / 'welcome.ansi').write_bytes(data)
        os.write(fd, b'ECHO:Ready to cook. Start small, keep the recipes you like.\r')
        pump(1)
        os.write(fd, b'TOOL:read:recipe.txt\r')
        pump(1)
        (output / 'working.ansi').write_bytes(data)
    finally:
        os.kill(pid, signal.SIGTERM)
        for _ in range(40):
            done, _ = os.waitpid(pid, os.WNOHANG)
            if done:
                break
            time.sleep(0.05)
        else:
            os.kill(pid, signal.SIGKILL)
            os.waitpid(pid, 0)
        os.close(fd)
    assert not (base / 'network.log').exists()

palette = {'default': '#c6d0f5', 'black': '#232634', 'red': '#e78284', 'green': '#a6d189', 'brown': '#e5c890',
           'blue': '#8caaee', 'magenta': '#ca9ee6', 'cyan': '#81c8be', 'white': '#c6d0f5',
           'brightblack': '#737994', 'brightred': '#e78284', 'brightgreen': '#a6d189', 'brightbrown': '#e5c890',
           'brightblue': '#8caaee', 'brightmagenta': '#ca9ee6', 'brightcyan': '#81c8be', 'brightwhite': '#f2d5cf'}
font = ImageFont.truetype(str(args.font), 18)
cell_width = round(font.getlength('M'))
cell_height = 24
padding, header = 24, 44
def color(value, background=False):
    if value == 'default':
        return '#303446' if background else '#c6d0f5'
    return palette.get(value, '#' + value if len(value) == 6 else '#c6d0f5')
for name in ['welcome', 'working']:
    screen = pyte.Screen(columns, rows)
    pyte.Stream(screen).feed((output / f'{name}.ansi').read_text(errors='replace'))
    image = Image.new('RGB', (columns * cell_width + padding * 2, rows * cell_height + padding * 2 + header), '#232634')
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((8, 8, image.width - 8, image.height - 8), radius=14, fill='#303446')
    draw.text((padding, 17), 'cooking-pi / recommended', font=font, fill='#a5adce')
    for y in range(rows):
        for x in range(columns):
            char = screen.buffer[y][x]
            foreground, background = color(char.fg), color(char.bg, True)
            if char.reverse:
                foreground, background = background, foreground
            left, top = padding + x * cell_width, padding + header + y * cell_height
            draw.rectangle((left, top, left + cell_width, top + cell_height), fill=background)
            if char.data and char.data != ' ':
                draw.text((left, top), char.data, font=font, fill=foreground)
    image.save(root / 'assets' / ('preview.png' if name == 'welcome' else 'workflow.png'))
    (output / f'{name}.txt').write_text('\n'.join(screen.display) + '\n')
print(json.dumps({'images': ['assets/preview.png', 'assets/workflow.png'], 'source': 'actual offline Pi PTY; synthetic model and usage', 'networkAttempts': 0}))
