/**
 * Reference model economics.
 *
 * Published list prices per million tokens, used to compare architectures.
 * Providers change prices and add tiers; this table is the only place to edit
 * and the UI labels it as reference pricing rather than a quote.
 */

export type ModelTier = "budget" | "balanced" | "premium";

export type ModelPricing = {
  id: string;
  label: string;
  provider: string;
  tier: ModelTier;
  /** Context window in tokens. */
  contextWindow: number;
  /** USD per 1M input tokens. */
  inputPerMillion: number;
  /** USD per 1M output tokens. */
  outputPerMillion: number;
};

export const modelPricing: ModelPricing[] = [
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    provider: "OpenAI",
    tier: "budget",
    contextWindow: 128_000,
    inputPerMillion: 0.15,
    outputPerMillion: 0.6,
  },
  {
    id: "gpt-4.1-mini",
    label: "GPT-4.1 mini",
    provider: "OpenAI",
    tier: "budget",
    contextWindow: 1_047_576,
    inputPerMillion: 0.4,
    outputPerMillion: 1.6,
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    provider: "OpenAI",
    tier: "premium",
    contextWindow: 128_000,
    inputPerMillion: 2.5,
    outputPerMillion: 10,
  },
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    provider: "OpenAI",
    tier: "premium",
    contextWindow: 1_047_576,
    inputPerMillion: 2,
    outputPerMillion: 8,
  },
  {
    id: "claude-haiku",
    label: "Claude Haiku",
    provider: "Anthropic",
    tier: "budget",
    contextWindow: 200_000,
    inputPerMillion: 0.8,
    outputPerMillion: 4,
  },
  {
    id: "claude-sonnet",
    label: "Claude Sonnet",
    provider: "Anthropic",
    tier: "premium",
    contextWindow: 200_000,
    inputPerMillion: 3,
    outputPerMillion: 15,
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "Google",
    tier: "budget",
    contextWindow: 1_048_576,
    inputPerMillion: 0.3,
    outputPerMillion: 2.5,
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "Google",
    tier: "balanced",
    contextWindow: 1_048_576,
    inputPerMillion: 1.25,
    outputPerMillion: 10,
  },
  {
    id: "deepseek-chat",
    label: "DeepSeek Chat",
    provider: "DeepSeek",
    tier: "budget",
    contextWindow: 64_000,
    inputPerMillion: 0.27,
    outputPerMillion: 1.1,
  },
  {
    id: "qwen-2.5-72b",
    label: "Qwen 2.5 72B",
    provider: "Qwen",
    tier: "budget",
    contextWindow: 128_000,
    inputPerMillion: 0.4,
    outputPerMillion: 1.2,
  },
  {
    id: "llama-3.3-70b",
    label: "Llama 3.3 70B",
    provider: "Hosted open model",
    tier: "balanced",
    contextWindow: 128_000,
    inputPerMillion: 0.59,
    outputPerMillion: 0.79,
  },
];

export const pricingNote =
  "Reference list prices per 1M tokens, shown for comparison only. Verify with the provider before budgeting; the table lives in packages/core/src/tools/token-estimator/pricing.ts.";

export function findModel(id: string): ModelPricing | undefined {
  return modelPricing.find((model) => model.id === id);
}

/** Cost of a single completed call, in USD. */
export function estimateCostUsd(
  modelId: string,
  usage: { inputTokens: number; outputTokens: number },
): number {
  const model = findModel(modelId);
  if (!model) return 0;

  return (
    (usage.inputTokens / 1_000_000) * model.inputPerMillion +
    (usage.outputTokens / 1_000_000) * model.outputPerMillion
  );
}
