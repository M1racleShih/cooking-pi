# 个人配方

`personal` 保存我的扩展组合和可公开的模型参数。认证、端点地址、组织与账号信息由使用者自己提供。

```sh
npm run plan -- --preset personal
npm run setup -- --preset personal
npm run doctor -- --preset personal
npm run pi -- --preset personal
```

默认 provider/model 是 `openai-codex/gpt-6.1-sol`，思考级别 medium。先 `/login` 登录自己的 Codex 账号，或修改自己的 `settings.json` 选用其他 provider/model。上下文与压缩预算是这个模型的个人覆盖值；换模型时重新核对。

## 自定义端点

`examples/provider-catalog.json` 记录可公开的模型定义。设置以下端点变量后再运行 `setup --preset personal`，安装工具才把该 provider 写入独立目录的 `models.json`：

| Provider | 端点变量 | 运行时认证变量 |
| --- | --- | --- |
| `qwen-local` | `QWEN_BASE_URL` | `QWEN_API_KEY` |
| `zai-coding-team` | `ZAI_TEAM_BASE_URL` | `ZAI_API_KEY_TEAM` |
| `newapi` | `NEWAPI_BASE_URL` | `NEWAPI_API_KEY` |

例如 `NEWAPI_BASE_URL` 应为你的兼容端点，包含其需要的 `/v1` 路径。`models.json` 保存端点和 `$NEWAPI_API_KEY` 引用，不保存该变量的密钥值。变量在运行 Pi 时也应可用。`.env.example` 只列示变量，不会被启动器自动读取；使用自己的 shell 或凭证管理器导出它们。

没有设置对应端点的 provider 不会生成，不会向示例域名发请求。再次 setup 时应保留所需端点环境变量，并先检查 plan；移除端点变量会使新计划不再包含该 provider。已有手动修改会要求先处理冲突。

`selected-models.ts` 还沿用了 Google、MiniMax、MiMo 与 GLM 的个人模型目录，以及对部分内置目录的覆盖。内置 provider 仍需自己的认证；公共 API 地址不代表账号已有访问权限。可以从配置的 `extensions` 中移除此文件来恢复原生目录。

## 搜索与总结

网页访问扩展可从自身配置选择搜索提供商。我的原配置使用本机 Qwen 作总结模型；公共配方不假设你拥有它，因此没有固定 `summaryModel`。需要时在自己的 `web-search.json` 填写可用模型。查看[上游配置文档](https://github.com/nicobailon/pi-web-access#readme)获取当前扩展支持的供应商变量。

## 额度与自动标题

`pi-hud.json` 的额度功能默认关闭。要使用时，参考[上游 HUD 配置](https://github.com/M1racleShih/pi-hud#readme)，在自己的目录填写受信任的 API origin 和账号配置。不要把该文件直接提交进仓库。

自动标题默认使用当前模型。如果要指定便宜的模型，可自行设置 `PI_TITLE_MODEL=provider/model-id`；将 prompt 发往另一个提供商是自己的明确选择。`PI_TITLE_OFF=1` 关闭自动标题。`/goal` 的自动回合和网页总结也可能增加请求。

## 与本机来源的差异

- undo-redo 固定到已包含兼容修复的 0.1.4，代替原来的 0.1.3 加安装目录补丁。
- HUD 运行源码来自当时工作区，但账号 profiles 移除、额度功能关闭。
- 私有端点从自己的环境生成，搜索总结模型不硬编码本机 Qwen。
- 不强制原账号的 enabledModels 列表；认证后通过 Pi 配置选择自己可用的模型范围。
- Herdr 桥接需要在自己的独立目录重新接入；技能没有默认启用项。

完整来源见 [source-inventory.json](source-inventory.json)。
