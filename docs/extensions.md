# 扩展配方

下表是首次发布的固定组合。版本升级通过修改清单、重建锁文件和重新验证完成，不在启动时追踪 latest。

| 项目 | 固定来源 | 配方 | 作用 / 额外要求 |
| --- | --- | --- | --- |
| [Pi](https://github.com/earendil-works/pi) | 1.2.0 | 全部 | 原生 CLI、工具、会话和模型接口 |
| [pi-block-editor](https://github.com/M1racleShih/pi-block-editor) | `bb42e1ff1f55db0c1bf080fe5631a16ca10648c5` | recommended / personal | 输入框与欢迎页；不调用模型 |
| [pi-hud](https://github.com/M1racleShih/pi-hud) | [运行源码快照](../packages/pi-hud-snapshot/ORIGIN.json) | recommended / personal | 底栏、上下文与用量展示；额度查询显式开启才联网 |
| [pi-provider-model-picker](https://github.com/M1racleShih/pi-provider-model-picker) | `94e218dd6a14cf43fab0e4fde0e9c9908412cb16` | recommended / personal | 提供商分组模型选择器；`/pm`、`Ctrl+L` |
| [pi-cc-extensions](https://github.com/minuque/pi-cc-extensions) | 1.0.4 | recommended / personal | 工具输出、`/context` 和会话引用；关闭重复的 footer/header/clear 别名 |
| 本仓库 clear | cooking-pi 0.1.0 | recommended / personal | `/clear` 新建会话并保留模型和思考级别 |
| [pi-web-access](https://github.com/nicobailon/pi-web-access) | 0.39.0 | personal | 搜索、网页与内容提取；搜索和总结需要各自供应商配置，可能有额外请求 |
| [pi-undo-redo](https://github.com/Yueby/pi-undo-redo) | 0.1.4 | personal | 会话及工作区撤销恢复；快照占用磁盘；只在可恢复的练习目录先试用 |
| [pi-codex-compaction](https://github.com/jvm/pi-mono/tree/main/packages/pi-codex-compaction) | 0.2.3 | personal | 针对支持的 Responses 模型的服务端压缩；需要对应上游能力 |
| [rpiv-todo](https://github.com/juicesharp/rpiv-mono/tree/main/packages/rpiv-todo) | 2.13.8 | personal | 给模型提供 todo 工具与交互界面 |
| [rpiv-ask-user-question](https://github.com/juicesharp/rpiv-mono/tree/main/packages/rpiv-ask-user-question) | 2.13.8 | personal | 结构化问题和选项 |
| [pi-goal](https://github.com/narumiruna/pi-extensions/tree/main/packages/pi-goal) | 0.54.11 | personal | `/goal` 持续推进任务；自动回合可能增加模型请求；配置为最多 60 回合、连续 3 回合无进展停止 |
| [pi-fff](https://github.com/dmtrKovalenko/fff/tree/main/packages/pi-fff) | 0.11.0 | personal | 原生 FFF 文件与内容搜索；依赖平台对应的预编译模块 |
| [pi-session-titler](https://github.com/M1racleShih/pi-session-titler) | 0.1.0 | personal | 未命名会话首次输入会额外调用标题模型；默认用当前模型；`PI_TITLE_OFF=1` 可关闭 |
| 本仓库 selected-models | cooking-pi 0.1.0 | personal | 我的供应商模型目录和参数定制，含覆盖/隐藏；不作为通用模型推荐 |

## 界面所有权

- Block Editor：输入框和新会话欢迎页。
- HUD：底栏。额度配置初始为 `enabled: false, profiles: []`。
- CC：工具输出。`enableAliases`、`enableCustomFooter`、`showStartupHeader`、`enableSubagentAutocomplete` 全部为 false。
- clear：唯一 `/clear` 命令。

额外安装一个 footer、header、editor 或工具渲染扩展前，应先决定谁拥有对应界面。加载顺序不应该成为解决冲突的唯一办法。

![推荐组合的实际工具输出](../assets/workflow.png)

图中由离线 fixture 驱动真实 Pi 读取练习文件，模型、响应及用量是合成数据。

## 按需停用

进入 Pi 的 `pi config` 对应资源配置界面，或从生成的 `settings.json` 的 `packages` 中移除对应路径，然后 `/reload`。也可从 `minimal` 配方开始逐项加入。安装工具不会在每次启动时重写你的配置；重新 `setup` 时会提示冲突。

生成的包路径指向本仓库的锁定依赖。对这些本地路径运行 `pi update --extensions` 不会更新 npm 锁文件；按[维护流程](maintenance.md)更新。

## 外部集成

Herdr 的状态桥由 Herdr 管理，重新安装/升级集成会覆盖其生成文件。因此本仓库只记录原文件的来源和哈希，不复制桥接源码。参见[外部集成说明](integrations.md)。技能在首次盘点时为空，本仓库不会自动启用控制中心或其他项目的技能副本。
