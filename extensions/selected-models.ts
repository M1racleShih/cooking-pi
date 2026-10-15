import { getBuiltinModel } from "@earendil-works/pi-ai/providers/all";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// Keep each provider limited to the user's selected models.
export default function (pi: ExtensionAPI) {
  // Reuse Pi's catalog metadata and preserve Google's built-in authentication.
  pi.registerProvider("google", {
    models: [
      getBuiltinModel("google", "gemini-3.8-flash"),
      getBuiltinModel("google", "gemini-3.1-pro-preview"),
      getBuiltinModel("google", "gemini-3.1-pro-preview-customtools"),
    ],
  });

  pi.registerProvider("minimax", {
    models: [
      {
        id: "MiniMax-M3",
        name: "MiniMax-M3",
        api: "anthropic-messages",
        baseUrl: "https://api.minimax.io/anthropic",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0 },
        contextWindow: 1_000_000,
        maxTokens: 128_000,
      },
    ],
  });

  pi.registerProvider("xiaomi", { models: [] });

  pi.registerProvider("xiaomi-token-plan-cn", {
    models: [
      {
        id: "mimo-v2.5-pro",
        name: "MiMo-V2.5-Pro",
        api: "openai-completions",
        baseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
        reasoning: true,
        input: ["text"],
        // Token Plan Credits rates, in M-Credits per 1M tokens (official FAQ):
        // cache-hit input 2.5 / cache-miss input 300 / output 600.
        cost: { input: 300, output: 600, cacheRead: 2.5, cacheWrite: 0 },
        contextWindow: 1_048_576,
        maxTokens: 131_072,
        compat: {
          requiresReasoningContentOnAssistantMessages: true,
          thinkingFormat: "deepseek",
        },
      },
      {
        id: "mimo-v2.6-flash",
        name: "MiMo-V2.6-Flash",
        api: "openai-completions",
        baseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
        reasoning: true,
        input: ["text", "image"],
        // Token Plan Credits rates, in M-Credits per 1M tokens (official FAQ):
        // cache-hit input 2 / cache-miss input 100 / output 200.
        cost: { input: 100, output: 200, cacheRead: 2, cacheWrite: 0 },
        contextWindow: 1_048_576,
        maxTokens: 131_072,
        compat: {
          supportsStrictMode: true,
          requiresReasoningContentOnAssistantMessages: true,
          thinkingFormat: "deepseek",
        },
      },
      {
        id: "mimo-v2.6-pro",
        name: "MiMo-V2.6-Pro",
        api: "openai-completions",
        baseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
        reasoning: true,
        input: ["text", "image"],
        // Token Plan Credits rates, in M-Credits per 1M tokens (official FAQ):
        // cache-hit input 2.5 / cache-miss input 300 / output 600.
        cost: { input: 300, output: 600, cacheRead: 2.5, cacheWrite: 0 },
        contextWindow: 1_048_576,
        maxTokens: 131_072,
        compat: {
          supportsStrictMode: true,
          requiresReasoningContentOnAssistantMessages: true,
          thinkingFormat: "deepseek",
        },
      },
    ],
  });

  pi.registerProvider("zai-coding-cn", {
    models: [
      {
        id: "glm-5-turbo",
        name: "GLM-5-Turbo",
        api: "openai-completions",
        baseUrl: "https://open.bigmodel.cn/api/coding/paas/v4",
        reasoning: true,
        input: ["text"],
        cost: { input: 1.2, output: 4, cacheRead: 0.24, cacheWrite: 0 },
        contextWindow: 200_000,
        maxTokens: 131_072,
        compat: {
          supportsStore: false,
          supportsDeveloperRole: false,
          supportsReasoningEffort: false,
          maxTokensField: "max_tokens",
          thinkingFormat: "zai",
          zaiToolStream: true,
        },
      },
      {
        id: "glm-5.3",
        name: "GLM-5.3",
        api: "openai-completions",
        baseUrl: "https://open.bigmodel.cn/api/coding/paas/v4",
        reasoning: true,
        thinkingLevelMap: {
          off: null,
          minimal: null,
          low: "low",
          medium: null,
          high: "high",
          xhigh: null,
          max: "max",
        },
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1_000_000,
        maxTokens: 131_072,
        compat: {
          supportsStore: false,
          supportsDeveloperRole: false,
          supportsReasoningEffort: true,
          maxTokensField: "max_tokens",
          thinkingFormat: "zai",
          zaiToolStream: true,
        },
      },
      {
        id: "glm-5.3-flash",
        name: "GLM-5.3-Flash",
        reasoning: true,
        thinkingLevelMap: {
          off: null,
          minimal: null,
          low: "low",
          medium: null,
          high: "high",
          xhigh: null,
          max: "max",
        },
        input: ["text", "image"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1_048_576,
        maxTokens: 131_072,
        compat: {
          supportsStore: false,
          supportsDeveloperRole: false,
          supportsReasoningEffort: true,
          maxTokensField: "max_tokens",
          thinkingFormat: "zai",
          zaiToolStream: true,
        },
      },
    ],
  });
}
