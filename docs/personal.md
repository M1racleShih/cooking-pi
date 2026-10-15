# 个人配方

`personal` 保存我的扩展组合和可公开的模型参数。认证、端点地址、组织与账号信息由使用者自己提供。

按[上手指南](getting-started.md)克隆仓库、准备 Node 并安装依赖后，在仓库目录执行：

```sh
npm run plan -- --preset personal
npm run setup -- --preset personal
npm run doctor -- --preset personal
npm run pi -- --preset personal
```

默认使用 `openai-codex/gpt-6.1-sol`，思考级别为 medium。在 Pi 中执行 `/login` 登录自己的 Codex 账号，或修改自己的 `settings.json` 选择其他提供商和模型。上下文长度与压缩时预留的 token 数是我为这个模型手动调整的参数，换模型时需要重新核对。

## 自定义端点

`examples/provider-catalog.json` 记录可公开的模型定义。设置以下端点变量后，在仓库目录运行 `npm run setup -- --preset personal`，安装工具才把对应提供商写入独立目录的 `models.json`：

| Provider | 端点变量 | 运行时认证变量 |
| --- | --- | --- |
| `qwen-local` | `QWEN_BASE_URL` | `QWEN_API_KEY` |
| `zai-coding-team` | `ZAI_TEAM_BASE_URL` | `ZAI_API_KEY_TEAM` |
| `newapi` | `NEWAPI_BASE_URL` | `NEWAPI_API_KEY` |

例如 `NEWAPI_BASE_URL` 应为你的兼容端点，包含其需要的 `/v1` 路径。`models.json` 保存端点和 `$NEWAPI_API_KEY` 引用，不保存该变量的密钥值。变量在运行 Pi 时也应可用。`.env.example` 只列示变量，不会被启动器自动读取；使用自己的 shell 或凭证管理器导出它们。

没有设置端点变量的提供商不会写入配置，也不会向示例域名发请求。重新生成配置时，保留所需的端点环境变量，并先运行 `npm run plan -- --preset personal` 查看计划；移除某个端点变量后，新计划就不再包含该提供商。已有手动修改会要求先处理冲突。

`selected-models.ts` 还沿用了 Google、MiniMax、MiMo 与 GLM 的个人模型目录，以及对部分内置目录的覆盖。内置 provider 仍需自己的认证；公共 API 地址不代表账号已有访问权限。可以从配置的 `extensions` 中移除此文件来恢复原生目录。

## 搜索与总结

网页访问扩展可从自身配置选择搜索提供商。我的原配置使用本机 Qwen 作总结模型；公共配方不假设你拥有它，因此没有固定 `summaryModel`。需要时在自己的 `web-search.json` 填写可用模型。查看[上游配置文档](https://github.com/nicobailon/pi-web-access#readme)获取当前扩展支持的供应商变量。

## 额度与自动标题

`pi-hud.json` 的额度功能默认关闭。要使用时，参考[上游 HUD 配置](https://github.com/M1racleShih/pi-hud#readme)，在自己的目录填写受信任的 API origin 和账号配置。不要把该文件直接提交进仓库。

自动标题默认使用当前模型。如果要指定便宜的模型，可自行设置 `PI_TITLE_MODEL=provider/model-id`；将 prompt 发往另一个提供商是自己的明确选择。`PI_TITLE_OFF=1` 关闭自动标题。`/goal` 的自动回合和网页总结也可能增加请求。

## 与本机来源的差异

- undo-redo 固定到已包含兼容修复的 0.1.4，代替原来的 0.1.3 加安装目录补丁。
- HUD 运行源码来自当时的工作区；公开配置没有包含个人账号信息，额度功能默认关闭。
- 端点地址读取使用者自己的环境变量；网页总结由使用者选择可用模型。
- 不强制原账号的 enabledModels 列表；认证后通过 Pi 配置选择自己可用的模型范围。
- Herdr 桥接需要在自己的独立目录重新接入；技能没有默认启用项。

完整来源见 [source-inventory.json](source-inventory.json)。[原始设置记录](source-settings.json)另存了当时的模型范围、界面偏好和旧扩展字段，便于比较个人取舍；本地源码路径已替换为标签，这份记录不应直接当安装配置使用。需要复现我的模型范围时，在自己的提供商认证完成后，按其中的 `enabledModels` 列表调整个人配置。
