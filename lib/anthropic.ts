import Anthropic from "@anthropic-ai/sdk";

// Singleton Anthropic client
const globalForAnthropic = globalThis as unknown as {
  anthropic: Anthropic | undefined;
};

export const anthropic =
  globalForAnthropic.anthropic ??
  new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

if (process.env.NODE_ENV !== "production") {
  globalForAnthropic.anthropic = anthropic;
}

// Model constants
export const MODELS = {
  FAST: "claude-haiku-4-5-20251001",
  SMART: "claude-sonnet-4-6",
} as const;

// Helper to build a system prompt block with prompt caching
export function buildCachedSystemBlock(text: string): Anthropic.TextBlockParam & { cache_control: { type: "ephemeral" } } {
  return {
    type: "text",
    text,
    cache_control: { type: "ephemeral" },
  };
}

export default anthropic;
