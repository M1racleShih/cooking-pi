# cooking-pi

把日常 Pi 工作环境写成可复现的配方：配置、扩展、使用方法，以及每个选择背后的原因。

[English](README.en.md) · [上手指南](docs/getting-started.md) · [扩展清单](docs/extensions.md) · [配置取舍](docs/decisions.md) · [兼容与验证](docs/compatibility.md) · [参与讨论](https://github.com/M1racleShih/cooking-pi/discussions)

这是我在 Linux 上日常使用的 [Pi](https://github.com/earendil-works/pi) 配置和扩展参考。你可以直接使用官方 Pi，按需取用其中一项配置；也可以克隆仓库，完整复现这里的扩展组合。

复现工具运行的是官方发布的 Pi，固定版本为 1.2.0。它在独立目录生成配置，已有的 `~/.pi/agent` 不参与配方的安装和卸载。

![推荐配置的真实 Pi 终端预览](assets/preview.png)

预览来自实际 Pi 的离线终端输出；演示模型与用量为合成数据。

## 先使用官方 Pi

初次接触 Pi，建议先按[官方安装说明](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/quickstart.md)安装。使用 Node.js 22.19 或更新版本时，也可以直接运行：

```sh
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
cd /path/to/your-project
pi
```

在 Pi 中执行 `/login` 登录自己的模型提供商，再用 `/model` 选择模型。随后可以参考[扩展清单](docs/extensions.md)，用官方的 `pi install` 按需安装扩展。这条路径不需要克隆 cooking-pi，认证和配置默认保存在 `~/.pi/agent`。

想先试一个扩展，可以退出 Pi 后在终端运行以下命令，再启动 Pi：

```sh
pi install npm:pi-cc-extensions@1.0.4
pi
```

这会安装 CC 扩展；截图中的完整界面还需要其他扩展和配置。官方 Pi 可以独立更新，本文记录的组合则以 Pi 1.2.0 为验证基线。详细步骤见[上手指南](docs/getting-started.md)。

## 完整复现这份配方

想复现截图中的组合、比较三种配方，或参与维护时，再克隆仓库。目前完整配方依赖仓库内的文件，尚未提供通过一条 `pi install` 命令应用全部配置的安装包。

复现基线为 Node.js **24.18.0** 和 npm **11.8.0**。在终端执行：

```sh
git clone https://github.com/M1racleShih/cooking-pi.git
cd cooking-pi
npm ci --ignore-scripts

npm run plan
npm run setup
npm run doctor
npm run pi
```

在 Pi 中执行 `/login`，登录你自己的模型提供商，再通过 `/model` 或 `Ctrl+L` 选择模型。环境变量形式的 API key 同样可用，参见 [Pi providers 文档](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/providers.md)。认证只保存在自己的独立目录中。

默认配置是 `recommended`，默认目录为 `~/.local/share/cooking-pi/recommended`。`COOKING_PI_HOME` 可以替换 cooking-pi 的基础目录；也可向每条命令传入相同的 `--agent-dir /your/dedicated/directory`。

| 配方 | 内容 | 适合谁 |
| --- | --- | --- |
| `minimal` | 原生 Pi、独立配置目录 | 想先了解 Pi 基础能力 |
| `recommended` | Catppuccin、Block Editor、HUD、分组模型选择器、CC 工具输出、`/clear` | 想获得本文展示的界面体验 |
| `personal` | 我的完整扩展组合、模型目录定制和可选端点 | 已熟悉 Pi，希望研究工作流和集成方式 |

例如在独立配置目录中对比原生 Pi：

```sh
npm run setup -- --preset minimal
npm run pi -- --preset minimal
```

每种配方使用自己的目录，认证和会话也分别保存。`personal` 的模型默认值来自我的日常配置，需要自己的 Codex 登录；你可以自行换模型。更多端点设置见[个人配方](docs/personal.md)。

## 在其他项目使用这份配方

启动器保留当前工作目录，因此 Pi 仍会读取目标项目的说明和经过信任确认的项目配置。可以给启动器设置一个别名，下面路径替换为你的实际克隆位置：

```sh
alias cooking-pi='node /path/to/cooking-pi/bin/cooking-pi.mjs'
cd /path/to/your-project
cooking-pi run
```

`run` 后的 `--` 将剩余参数原样传给 Pi，例如 `cooking-pi run -- --offline`。独立配置目录不是执行沙箱；项目扩展和 shell 工具仍具有 Pi 本身的权限。

## 这里具体组合了什么

输入框和欢迎页交给 **pi-block-editor**，底栏交给 **pi-hud**，工具输出交给 **pi-cc-extensions**。CC 的重复 header、footer 和 `/clear` 别名关闭。`/clear` 使用本仓库的小扩展，开启新会话时保留当前模型和思考级别。

`personal` 还包括网页访问、undo/redo、服务端压缩、todo、结构化提问、goal、FFF 文件搜索和自动标题。自动标题会发起额外模型请求，网页总结也可能调用模型；额度查询默认为关闭。具体触发条件、依赖和停用方法都在[扩展清单](docs/extensions.md)。

## 调整、更新和退出

`presets/` 是 cooking-pi 使用的模板目录，由安装工具生成普通 Pi 配置。它不是 Pi 的内置 profile 功能。生成后可以直接修改自己的配置；`doctor` 检查 JSON 和依赖版本，不把个人修改当错误。

以下命令都在仓库目录执行。`npm run plan` 只显示将要操作的文件和内容哈希。`npm run setup` 对手动改过的文件默认报冲突；查看计划后，可用 `npm run setup -- --replace` 备份再替换。备份留在该配置目录的 `.cooking-pi-backups/`。使用其他配方或目录时，每条命令都要带上相同的 `--preset` 和 `--agent-dir` 参数。

```sh
node bin/cooking-pi.mjs uninstall --dry-run
node bin/cooking-pi.mjs uninstall
```

卸载只处理安装记录中的配置文件：恢复原文件，移除仍与安装时一致的新建文件，保留后来手动修改的文件。认证、会话、备份和其他状态始终保留。[更新与恢复](docs/maintenance.md)说明如何更新固定版本、迁移目录和单独移除扩展。

## 复现范围

Pi 固定为 **1.2.0**，第三方扩展使用精确版本或 Git 提交，传递依赖由 `package-lock.json` 固定。安装禁用 npm 生命周期脚本。启动器使用仓库内的 Pi，不要求全局安装，也不会运行 `pi update --all`。

这次整理以 **2026-10-15** 的本机配置为来源。HUD 含有尚未独立发布的运行源码改动，因此保存了带逐文件哈希的[运行源码快照](packages/pi-hud-snapshot/README.md)。undo-redo 使用包含上游兼容修复的 **0.1.4**。私有端点、账号、认证、会话、缓存、备份和历史运行记录不在仓库中。[来源清单](docs/source-inventory.json)列出了这些处理。

首次发布以 Linux 和 Node 24.18.0 为验证基线。macOS、Windows 以及不同终端的输入法、剪贴板和快捷键表现，需要各自验证；当前结果见[兼容记录](docs/compatibility.md)。

## 一起改配方

欢迎在 [Discussions](https://github.com/M1racleShih/cooking-pi/discussions) 分享配置、讨论取舍，在 [Issues](https://github.com/M1racleShih/cooking-pi/issues) 报告兼容问题，或按 [CONTRIBUTING.md](CONTRIBUTING.md) 提交 PR。最好附上 Pi、Node、终端、操作系统和扩展版本，以及能复现问题的最小组合。

本仓库为 MIT 许可。第三方扩展保留原有作者、来源和许可证，见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
