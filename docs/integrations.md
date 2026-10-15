# 可选外部集成

## Herdr

来源环境有两个 Herdr 相关扩展：状态桥和 Nerd Font 环境兼容。状态桥的文件头明确标为由 Herdr 管理、重新安装会覆盖，所以 cooking-pi 不接管其源码或版本生命周期。

使用 Herdr 的用户，应通过自己的 Herdr 安装为 Pi 配置集成，并将该受管理桥接文件加入 cooking-pi 独立目录的 Pi `extensions` 配置。桥接文件路径和具体接入方式取决于自己的 Herdr 安装；核对当前 Herdr 集成文档，不要假设所有机器都安装在同一路径。生成文件不应作为个人配置源码提交。

已取得 Herdr 管理的桥接文件后，可以先对一次运行显式加载它：

```sh
node /path/to/cooking-pi/bin/cooking-pi.mjs run -- -e /path/to/herdr-managed/herdr-agent-state.ts
```

将示例中的仓库和桥接文件路径换成实际路径，使用其他配方时也带上相应的 `--preset`。确认自己的 Herdr 窗格状态上报正常后，再把同一路径加入独立配置的 `extensions` 数组。这个操作直接引用 Herdr 管理的文件；后续重新生成配方配置时，会识别这项手动修改。

启动器保留已有的 `HERDR_*` 环境变量；存在 `HERDR_PANE_ID` 且未指定 `POWERLINE_NERD_FONTS` 时，将后者设为 `1`，对应来源环境的小兼容扩展。普通终端不会设置这一项。

首次发布的自动验收不接管现有 Herdr pane，也不声称验证了跨机器 Herdr 状态上报。

## Skills

整理本仓库时（2026-10-15），我的全局 Pi 技能目录和当时使用的项目 `.pi/skills` 均为空，因此配方没有默认启用的技能。更早的维护记录不代表这次盘点的状态。

需要技能时，在目标项目内通过自己使用的管理工具启用，保留来源和版本。dskills 用户应管理技能源和锁定版本，不提交其生成的各 agent 副本；其他项目的版本不应被 cooking-pi 安装修改。

## 模型网关

Pi 可以使用公开或私有兼容端点。配置字段与原生 Pi 保持一致，示例见[个人配方](personal.md)。本仓库不安装、启动或修改网关服务，不复制其他 agent 的凭证或路由。
