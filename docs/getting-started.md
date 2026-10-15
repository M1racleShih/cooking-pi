# 第一次使用 Pi

## 准备环境

本仓库的基线是 Node 24.18.0、npm 11.8.0 和 Pi 1.2.0。使用你熟悉的 Node 安装方式；已有 nvm 的用户可以在仓库中运行 `nvm install`，`.nvmrc` 会选择固定版本。依赖安装用 `npm ci --ignore-scripts`，不要用全局 Pi 代替仓库里的固定版本来做复现验收。

## 先选一条路径

只想先了解 Pi：

```sh
npm run setup -- --preset minimal
npm run pi -- --preset minimal
```

想直接使用推荐界面：

```sh
npm run plan
npm run setup
npm run pi
```

`setup` 只在专用目录生成配置，不登录、不迁移现有认证，也不向模型发请求。默认目录分别是 `~/.local/share/cooking-pi/minimal` 和 `~/.local/share/cooking-pi/recommended`。

## 登录和第一个任务

在 Pi 中执行 `/login`，选择自己拥有的提供商；或在启动前设置提供商支持的 API key 环境变量。选择 `/model`，确认当前模型可用。推荐配置的 `Ctrl+L` 打开按提供商分组的选择器，`Ctrl+Alt+L` 保留原生选择器。

在一个专用练习目录启动，先让 Pi 读取一个示例文件，再修改其中一行。模型服务的认证、计费和可用性由自己的提供商决定。`doctor` 不调用模型，不能替代这一项真实检查。

## 常用操作

| 操作 | 用途 |
| --- | --- |
| `/model` | 原生模型选择器 |
| `/pm` 或 `Ctrl+L` | 推荐/个人配置的分组选择器 |
| `/new` | 原生新会话行为 |
| `/clear` | 推荐/个人配置中新建会话，保留模型和思考级别 |
| `/reload` | 重新读取配置、扩展和资源 |
| `/resume` | 恢复该配置目录下的历史会话 |
| `/hud status` | 了解底栏统计的实际覆盖范围 |
| `/ccstyle` | CC 工具输出配置 |
| `/context` | 上下文估算；分类 token 不是账单精确值 |

不同终端可能拦截某些按键；命令形式仍然可用。配置文件修改后执行 `/reload`，依赖或 Pi 升级后重启。

## 常见问题

- 没有模型：完成自己的认证，并确认所选模型属于自己的账号。
- npm 下载失败：先检查网络或使用自己的受支持代理配置；不要删除锁文件来绕过版本问题。
- 配置冲突：运行 `plan` 查看文件列表。确认需要替换时，`setup --replace` 会先备份；也可选择一个新目录试用。
- 提示仓库位置变化：先运行 `plan`，再 `setup --replace` 更新生成配置中的绝对路径。
- 切换配方后没有旧会话：每种配方的认证和会话独立，这是存储位置不同。可以继续使用原来的配方。

下一步：[扩展清单](extensions.md)、[个人配置](personal.md)、[维护与恢复](maintenance.md)。
