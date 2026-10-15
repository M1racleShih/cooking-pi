# 兼容与验证

首次发布基线：**2026-10-15**，Linux x86_64，Node **24.18.0**，npm **11.8.0**，Pi **1.2.0**。扩展版本见[清单](extensions.md)，依赖完整性见 `package-lock.json`。

## 自动检查

| 检查 | 方法与范围 |
| --- | --- |
| 安装与恢复 | `npm test`：计划不写入、幂等安装、冲突预检、备份和恢复、保留后续修改、保留认证与会话、拒绝文件/备份符号链接、拒绝路径穿越记录、独立配置与参数透传 |
| 原生资源加载 | `npm run test:load`：minimal 0、recommended 5、personal 14 个配置扩展入口，均无加载错误、警告和主题诊断；检查唯一 clear、pm/context 注册，以及 undo-redo 的 custom-run 修复 |
| 真实终端 | `npm run test:tui`：三种配方分别在 regular/fullscreen PTY 运行，使用实际 Pi、扩展、工具和会话实现 |
| 组合行为 | 验证调用者 cwd、模型与思考级别、read/write/edit、reload 后续回合、缩放；推荐/个人配置另测 Block Editor、HUD、CC write 所有权、context、Ctrl+L 和 clear 保留模型/思考级别 |
| undo-redo | personal 的两种 TUI 模式：undo 还原文件，自定义消息继续运行后仍可 redo，再次恢复文件 |
| 公开文件 | `npm run check:public`：允许的源文件范围、常见凭证模式、本机 home 路径、文档本地链接、固定依赖来源、22 个 HUD 运行文件哈希；发布前另做人工检查 |

这些检查使用独立 HOME、临时配置目录和临时工作区。模型响应由进程内 fixture 产生；网络 guard 禁止请求，检查会确认没有网络尝试。不会读取现有 Pi 认证，也不会调用真实供应商或产生付费模型请求。

运行终端测试后，原始 ANSI 和 JSON 报告位于 `.local/verification/`，不进入 Git。README 预览图来自真实 Pi 的离线演示输出，模型和用量为合成数据。

## 依赖安装和审计

使用 `npm ci --ignore-scripts` 从锁文件安装。首次本机审计包含完整依赖树，`npm audit` 报告 0 个漏洞；这是检查当天的 registry 结果，不能替代以后重新审计。

仅含 Git 文件的干净克隆，使用独立 HOME 从锁文件重装后，16 项单元测试、三组资源加载和六组 PTY 检查均通过。公开 GitHub 仓库的 Ubuntu CI 也独立安装并执行相同检查；首轮验收见 [Actions 运行记录](https://github.com/M1racleShih/cooking-pi/actions/runs/38695589177)。

## 尚未覆盖

- macOS、Windows、ARM 和其他 Node 版本的实际安装与终端使用。
- 各终端对 Ctrl/Alt 组合、桌面输入法候选窗、鼠标选择、剪贴板图片和远程显示协议的处理。
- 真实模型认证与响应、搜索供应商、服务端压缩、自动标题请求、额度账号对账，以及 goal 的长任务业务效果。
- Herdr 状态桥接；首次发布不接管已有 pane。
- Pi 升级后的 TUI 内部结构变化。Block Editor 的部分欢迎页布局使用带形状检查的内部适配，必须重新验证。

CI 在 Ubuntu 上重复执行安装、公开文件检查、单元测试、资源加载和六组 PTY 验收。具体提交是否通过，以该提交的 Actions 结果为准。
