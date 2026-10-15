# 第一次使用 Pi

如果你刚接触 Pi，先安装官方 Pi，再按需尝试扩展。想完整复现 cooking-pi 的组合时，再走下面的第二条路径。

## 路径一：直接使用官方 Pi

按[官方安装说明](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/quickstart.md)准备环境。使用 Node.js 22.19 或更新版本时，也可以通过 npm 安装：

```sh
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
mkdir -p ~/pi-playground
cd ~/pi-playground
pi
```

在 Pi 中执行 `/login`，登录自己的模型提供商，再用 `/model` 选择模型。也可以在启动前设置提供商支持的 API key 环境变量。

熟悉基本操作后，可以从[扩展清单](extensions.md)选择需要的功能。例如先退出 Pi，在终端安装 CC 扩展，再重新启动：

```sh
pi install npm:pi-cc-extensions@1.0.4
pi
```

这条路径不需要克隆 cooking-pi。Pi 默认使用 `~/.pi/agent`，可在终端运行 `pi config` 选择启用的资源。单独安装扩展会使用该扩展自己的默认配置；要得到本文截图中的组合，还需要其他扩展和配套设置。

上面的 npm 安装命令使用官方当前版本。cooking-pi 记录的组合以 Pi 1.2.0 为验证基线；使用其他版本时，需要核对扩展兼容性。

## 路径二：完整复现 cooking-pi

这条路径适合对比配方、复现截图或参与维护。它使用官方 Pi 1.2.0 和固定的扩展版本；完整配方目前仍需要克隆仓库并保留其目录。

复现基线是 Node 24.18.0 和 npm 11.8.0。先克隆仓库：

```sh
git clone https://github.com/M1racleShih/cooking-pi.git
cd cooking-pi
```

使用你熟悉的方式安装上述 Node 版本。已有 nvm 的用户，可以在仓库目录运行 `nvm install`，由 `.nvmrc` 选择固定版本。然后在同一目录执行：

```sh
npm ci --ignore-scripts
npm run plan
npm run setup
npm run doctor
npm run pi
```

默认的 `recommended` 配方包含推荐界面。想在独立配置目录中对比原生 Pi，可在仓库目录改用：

```sh
npm run setup -- --preset minimal
npm run pi -- --preset minimal
```

`setup` 只在专用目录生成配置，不登录、不迁移现有认证，也不向模型发请求。两种配方的默认目录分别是 `~/.local/share/cooking-pi/recommended` 和 `~/.local/share/cooking-pi/minimal`，各自保存认证和会话。原有的 `~/.pi/agent` 不参与配方的安装与卸载。复现验收使用仓库里的固定 Pi 版本。

启动后同样需要 `/login` 和 `/model`。推荐配置的 `Ctrl+L` 打开按提供商分组的模型选择器，`Ctrl+Alt+L` 打开原生选择器。

## 在练习目录完成第一个任务

直接使用官方 Pi 时，在练习目录运行 `pi` 即可。使用 cooking-pi 配方时，把下例中的 `/path/to/cooking-pi` 替换为实际克隆路径：

```sh
mkdir -p ~/pi-playground
cd ~/pi-playground
node /path/to/cooking-pi/bin/cooking-pi.mjs run
```

使用其他配方或独立目录时，在 `run` 后带上安装时相同的 `--preset` 和 `--agent-dir` 参数。

先让 Pi 读取一个示例文件，再修改其中一行。模型服务的认证、计费和可用性由自己的提供商决定。cooking-pi 的 `doctor` 不调用模型，不能替代这一步真实使用检查。

## 常用操作

| 操作 | 用途 | 适用范围 |
| --- | --- | --- |
| `/model` | 原生模型选择器 | 全部 |
| `/pm` 或 `Ctrl+L` | 按提供商分组的模型选择器 | recommended / personal |
| `/new` | 按 Pi 的原生行为新建会话 | 全部 |
| `/clear` | 新建会话，保留模型和思考级别 | recommended / personal |
| `/reload` | 重新读取配置、扩展和资源 | 全部 |
| `/resume` | 恢复当前配置目录下的历史会话 | 全部 |
| `/hud status` | 了解底栏统计的覆盖范围 | 启用 HUD 时 |
| `/ccstyle` | 调整 CC 工具输出 | 启用 CC 时 |
| `/context` | 估算上下文；分类 token 不是精确账单 | 启用 CC 时 |

不同终端可能拦截某些快捷键，可以使用对应命令。配置文件修改后执行 `/reload`，依赖或 Pi 升级后重启。

## 常见问题

- 没有模型：完成自己的认证，并确认所选模型属于自己的账号。
- npm 下载失败：检查网络或使用自己的受支持代理配置。复现配方时保留锁文件，以免改变依赖版本。
- 配方配置冲突：在仓库目录运行 `npm run plan` 查看文件列表。确认需要替换时，运行 `npm run setup -- --replace`，工具会先备份；也可选择一个新目录试用。
- 提示仓库位置变化：在新的仓库目录运行 `npm run plan`，再用 `npm run setup -- --replace` 更新配置中的绝对路径。
- 切换配方后没有旧会话：每种配方使用独立的认证和会话目录。要继续旧会话，可以切回原来的配方。

以上 cooking-pi 命令默认操作 `recommended`。使用其他配方或目录时，每条命令都要带上相同的 `--preset` 和 `--agent-dir` 参数。

下一步：[扩展清单](extensions.md)、[个人配置](personal.md)、[维护与恢复](maintenance.md)。
