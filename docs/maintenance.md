# 更新、恢复与卸载

## 本仓库拥有的内容

安装工具只管理预设生成的 JSON 文件和 `.cooking-pi.json` 安装记录。扩展源码与依赖在仓库中，认证和会话在独立配置目录中。启动器不会在每次运行时重新 setup。

`plan` 不写文件，不显示配置内容或凭证。`setup` 对尚未修改的生成文件应用配方更新，对手动修改的文件报冲突。`--replace` 会把被替换的内容写到权限受限的 `.cooking-pi-backups/<transaction>/`，随后替换。最初存在的文件保留恢复记录。

## 更新配方或移动仓库

先退出使用这份依赖的 Pi，查看仓库更新，再：

```sh
git pull --ff-only
npm ci --ignore-scripts
npm run plan
npm run setup
npm run doctor
```

配置包含指向克隆目录的绝对资源路径。移动克隆目录后，先 `plan`，必要时 `setup --replace` 刷新路径；备份仍保留。命令要带上自己一直使用的 `--preset` 和 `--agent-dir`。

手动改过的配置可自行合并差异后继续使用；也可以使用新目录验证更新。`setup --replace` 是替换整份托管文件，不自动合并个人字段。

## 更新 Pi 或扩展版本

修改 `package.json` 的精确版本/提交，更新锁文件，再运行：

```sh
npm install --ignore-scripts
npm run verify
npm run test:tui
```

在干净克隆中重新 `npm ci --ignore-scripts` 验证。更新 `docs/extensions.md`、来源差异和兼容记录；有运行源码变更时更新相关快照的逐文件哈希。不要对这套受锁文件管理的安装执行 `pi update --all`，它不能代替仓库的依赖更新流程。

HUD 快照应在独立 HUD 发布版覆盖所需功能后移除，替换为该发布版的固定来源，重新验证 footer、生命周期和额度功能。不要把本机工作区、账号配置或运行状态整体打包。

## 重新生成演示图

终端验收只需 Python 标准库。另行生成 README 演示图时，给自己的可选 Python 虚拟环境安装 `pyte==0.8.2`、`Pillow==11.3.0`，再运行：

```sh
python scripts/capture-preview.py --font /path/to/installed-monospace-font.ttf
```

脚本用临时目录启动真实 Pi，保留原始 ANSI，再渲染为 `assets/preview.png` 和 `assets/workflow.png`。模型与用量为合成数据，禁止网络请求；字体不打包。

## 卸载配置

```sh
node bin/cooking-pi.mjs uninstall --dry-run
node bin/cooking-pi.mjs uninstall
```

卸载恢复安装前存在并备份过的文件，删除安装新建且没有后来变化的文件，保留手动修改过的文件。认证、会话、原始备份及扩展产生的状态不会删除。需要彻底删除这些私人数据时，自行检查独立目录后处理；本工具没有递归清空整个目录的功能。

如果自己把第三方扩展额外安装到配置目录，卸载 cooking-pi 不管理那些文件。移除工作台配置后，仍应先检查目录里保留了什么，再决定下一步。
