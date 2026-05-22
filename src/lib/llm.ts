/**
 * LLM provider 切替
 * dev (LLM_PROVIDER=ollama) → ローカルOllama
 * prod (LLM_PROVIDER=gateway) → Vercel AI Gateway 経由 Gemini 2.0 Flash
 *
 * 設計書 §11.2 参照
 */
import { createOllama } from "ollama-ai-provider-v2";
import { gateway } from "@ai-sdk/gateway";
import type { LanguageModel } from "ai";

export function getModel(): LanguageModel {
  const provider = process.env.LLM_PROVIDER ?? "ollama";

  if (provider === "ollama") {
    const ollama = createOllama({
      baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/api",
    });
    return ollama(process.env.OLLAMA_MODEL ?? "qwen2.5:7b");
  }

  // production: AI Gateway 経由 (provider failover & 統合請求)
  return gateway(process.env.GATEWAY_MODEL ?? "google/gemini-2.0-flash");
}

export function getModelLabel(): string {
  const provider = process.env.LLM_PROVIDER ?? "ollama";
  if (provider === "ollama") {
    return `ollama/${process.env.OLLAMA_MODEL ?? "qwen2.5:7b"}`;
  }
  return process.env.GATEWAY_MODEL ?? "google/gemini-2.0-flash";
}
