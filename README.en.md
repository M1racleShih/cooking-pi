# cooking-pi

Reproducible recipes for a comfortable [Pi](https://github.com/earendil-works/pi) environment: configuration, extensions, workflows, and the reasons behind the choices.

[中文文档](README.md) · [Extension catalogue](docs/extensions.md) · [Compatibility](docs/compatibility.md) · [Discussions](https://github.com/M1racleShih/cooking-pi/discussions)

This repository records the author's Pi configuration and extension choices. You can use official Pi and adopt individual ideas, or clone this repository to reproduce the complete combination. The reproduction tool runs the official Pi package, pinned to 1.2.0.

![Actual Pi terminal, recommended preset](assets/preview.png)

Rendered from an actual offline Pi terminal session; the demo model and usage data are synthetic.

## Start with official Pi

For a first installation, follow the [official quickstart](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/quickstart.md). With Node.js 22.19 or newer, npm installation is also available:

```sh
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
cd /path/to/your-project
pi
```

Run `/login` inside Pi to authenticate your provider, then select a model with `/model`. You can use this repository's [catalogue](docs/extensions.md) to choose extensions and install them with Pi's own `pi install` command. No cooking-pi clone is needed for this path; Pi uses `~/.pi/agent` by default.

For example, exit Pi, install CC, and start Pi again:

```sh
pi install npm:pi-cc-extensions@1.0.4
pi
```

This installs CC alone. Reproducing the screenshots also requires the other extensions and their configuration. You can update official Pi independently; this repository's tested combination uses Pi 1.2.0.

## Reproduce the complete recipe

Clone the repository to reproduce the full combination, compare presets, or contribute. The complete recipe currently needs files from the clone; there is no single `pi install` command that applies all of its configuration.

Use Node **24.18.0** and npm **11.8.0**, the reproduction baseline. Run these commands in a terminal:

```sh
git clone https://github.com/M1racleShih/cooking-pi.git
cd cooking-pi
npm ci --ignore-scripts
npm run plan
npm run setup
npm run doctor
npm run pi
```

Run `/login` inside Pi to authenticate your own provider, then select a model with `/model` or `Ctrl+L`. Each preset uses a dedicated directory under `~/.local/share/cooking-pi/`; the installer refuses to manage your existing `~/.pi/agent`.

| Preset | Contents |
| --- | --- |
| `minimal` | Native Pi, isolated configuration |
| `recommended` | Catppuccin themes, block editor, HUD, grouped model picker, CC tool rendering, `/clear` |
| `personal` | The author's complete extension combination and optional compatible endpoints |

Select a preset with `--preset minimal` (or `personal`) on every command. Use `--agent-dir /dedicated/directory` or `COOKING_PI_HOME` to change storage. Presets have separate authentication and sessions.

The launcher preserves the caller's working directory. To use it in another project, invoke `node /path/to/cooking-pi/bin/cooking-pi.mjs run`. Pass Pi flags after `--`. Trusted project configuration still applies; a separate configuration directory is not a sandbox.

## Versions and extension roles

Pi is pinned to **1.2.0**. Exact extension versions, two Git commit archives, and the npm lockfile define the dependency tree. A runtime-only [HUD snapshot](packages/pi-hud-snapshot/README.md) preserves the author's currently uncommitted runtime changes without copying private account configuration. `pi-undo-redo` **0.1.4** includes the merged upstream custom-run fix.

The block editor handles the input area and welcome page, the HUD displays the footer, and CC renders tool output. Duplicate CC header/footer/clear aliases are disabled. Quota queries default off. `personal` additionally includes features that can make extra model or web requests; consult the [catalogue](docs/extensions.md) before enabling it.

Run maintenance commands from the repository directory. `npm run plan` is read-only. `npm run setup` refuses conflicting manual changes; `npm run setup -- --replace` backs them up before replacing them. `node bin/cooking-pi.mjs uninstall --dry-run` previews configuration removal; omit `--dry-run` to restore originals and retain modified files, credentials, sessions and backups. Include the same `--preset` and `--agent-dir` options you used during setup. See [maintenance](docs/maintenance.md).

Linux / Node 24.18.0 is the initial tested baseline. macOS, Windows, desktop IME and clipboard behavior require separate validation. Chinese documentation contains the detailed recipes; English questions and contributions are welcome in [Discussions](https://github.com/M1racleShih/cooking-pi/discussions) and [Issues](https://github.com/M1racleShih/cooking-pi/issues).

MIT. Third-party projects retain their own licences and attribution; see [notices](THIRD_PARTY_NOTICES.md).
