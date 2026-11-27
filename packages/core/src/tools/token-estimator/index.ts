import type { TokenEstimatorInput } from "../../contracts/tools";
import { estimateTokens, round } from "../../util/tokens";
import { modelPricing, pricingNote, type ModelPricing, type ModelTier } from "./pricing";

/**
 * The estimator is arithmetic, not inference: no provider is called, so the
 * answer is identical with or without an API key.
 */

export type ModelEstimate = {
  id: string;
  label: string;
  provider: string;
  tier: ModelTier;
  contextWindow: number;
  inputPerMillion: number;
  outputPerMillion: number;
  inputTokens: number;
  outputTokens: number;
  /** Share of the context window consumed by one call, 0–100+. */
  contextUsedPct: number;
  fitsContext: boolean;
  costPerRequest: number;
  costPer1kRequests: number;
  monthlyCostUsd: number;
};

export type TokenEstimatorResult = {
  inputTokens: number;
  systemTokens: number;
  outputTokens: number;
  totalTokensPerCall: number;
  monthlyRequests: number;
  rows: ModelEstimate[];
  cheapest: { id: string; label: string; monthlyCostUsd: number } | null;
  balanced: { id: string; label: string; monthlyCostUsd: number } | null;
  note: string;
  pricingNote: string;
};

const DEFAULT_MONTHLY_REQUESTS = 10_000;
const DEFAULT_OUTPUT_RATIO = 0.4;

function perModel(
  model: ModelPricing,
  input: { inputTokens: number; outputTokens: number; monthlyRequests: number },
): ModelEstimate {
  const totalTokens = input.inputTokens + input.outputTokens;
  const contextUsedPct = round((totalTokens / model.contextWindow) * 100, 2);
  const costPerRequest = round(
    (input.inputTokens / 1_000_000) * model.inputPerMillion +
      (input.outputTokens / 1_000_000) * model.outputPerMillion,
    8,
  );

  return {
    id: model.id,
    label: model.label,
    provider: model.provider,
    tier: model.tier,
    contextWindow: model.contextWindow,
    inputPerMillion: model.inputPerMillion,
    outputPerMillion: model.outputPerMillion,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    contextUsedPct,
    fitsContext: totalTokens <= model.contextWindow,
    costPerRequest,
    costPer1kRequests: round(costPerRequest * 1_000, 4),
    monthlyCostUsd: round(costPerRequest * input.monthlyRequests, 2),
  };
}

export function estimateTokenCost(input: TokenEstimatorInput): TokenEstimatorResult {
  const promptTokens = estimateTokens(input.prompt);
  const systemTokens = estimateTokens(input.systemPrompt ?? "");
  const inputTokens = promptTokens + systemTokens;

  const outputTokens =
    typeof input.expectedOutputTokens === "number"
      ? input.expectedOutputTokens
      : Math.round(inputTokens * (input.outputRatio ?? DEFAULT_OUTPUT_RATIO));

  const monthlyRequests = input.monthlyRequests ?? DEFAULT_MONTHLY_REQUESTS;

  const selected = input.modelIds?.length
    ? modelPricing.filter((model) => input.modelIds?.includes(model.id))
    : modelPricing;

  const models = selected.length > 0 ? selected : modelPricing;

  const rows = models
    .map((model) =>
      perModel(model, { inputTokens, outputTokens, monthlyRequests }),
    )
    .sort((a, b) => a.monthlyCostUsd - b.monthlyCostUsd);

  const cheapestRow = rows[0] ?? null;
  const balancedRow = rows.find((row) => row.tier === "balanced") ?? null;

  const note =
    rows.length > 0 && !rows.some((row) => row.fitsContext)
      ? "No model in this selection can hold the full prompt plus output. Shorten the context or split the request before choosing a tier."
      : "Token counts are a documented heuristic (±10–15% on prose), and prices are reference list prices. Nothing is called: the same numbers come back with or without an API key.";

  return {
    inputTokens,
    systemTokens,
    outputTokens,
    totalTokensPerCall: inputTokens + outputTokens,
    monthlyRequests,
    rows,
    cheapest: cheapestRow
      ? { id: cheapestRow.id, label: cheapestRow.label, monthlyCostUsd: cheapestRow.monthlyCostUsd }
      : null,
    balanced: balancedRow
      ? { id: balancedRow.id, label: balancedRow.label, monthlyCostUsd: balancedRow.monthlyCostUsd }
      : null,
    note,
    pricingNote,
  };
}
