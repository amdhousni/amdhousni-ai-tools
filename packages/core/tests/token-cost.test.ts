import { describe, expect, it } from "vitest";
import {
  estimateCostUsd,
  estimateTokenCost,
  estimateTokens,
  findModel,
  formatUsd,
  modelPricing,
  tokenEstimatorInputSchema,
} from "../src";

describe("estimateTokens", () => {
  it("returns zero for empty input and grows with length", () => {
    expect(estimateTokens("")).toBe(0);

    const short = estimateTokens("Ship the validated endpoint.");
    const long = estimateTokens("Ship the validated endpoint.".repeat(10));

    expect(short).toBeGreaterThan(0);
    expect(long).toBeGreaterThan(short);
  });

  it("counts non-ASCII characters individually", () => {
    const latin = estimateTokens("hello world");
    const thai = estimateTokens("สวัสดีชาวโลก");

    expect(thai).toBeGreaterThanOrEqual(12);
    expect(thai).toBeGreaterThan(latin);
  });
});

describe("pricing table", () => {
  it("prices a million input tokens at the published rate", () => {
    expect(estimateCostUsd("gpt-4o", { inputTokens: 1_000_000, outputTokens: 0 })).toBeCloseTo(2.5, 6);
    expect(
      estimateCostUsd("claude-sonnet", { inputTokens: 0, outputTokens: 1_000_000 }),
    ).toBeCloseTo(15, 6);
  });

  it("returns zero for an unknown model instead of throwing", () => {
    expect(estimateCostUsd("does-not-exist", { inputTokens: 1000, outputTokens: 1000 })).toBe(0);
    expect(findModel("does-not-exist")).toBeUndefined();
  });

  it("keeps every model id unique", () => {
    const ids = modelPricing.map((model) => model.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("formats small amounts with enough precision to be useful", () => {
    expect(formatUsd(0)).toBe("$0.00");
    expect(formatUsd(0.0021)).toBe("$0.0021");
    expect(formatUsd(12.3456)).toBe("$12.35");
  });
});

describe("estimateTokenCost", () => {
  const input = tokenEstimatorInputSchema.parse({
    prompt: "Summarise this contract clause in two sentences and list the obligations.",
    monthlyRequests: 5_000,
    expectedOutputTokens: 120,
  });

  it("computes per-call, per-1k and monthly cost consistently", () => {
    const result = estimateTokenCost(input);
    const row = result.rows.find((item) => item.id === "gpt-4o-mini");

    expect(row).toBeDefined();
    if (!row) return;

    expect(row.costPer1kRequests).toBeCloseTo(row.costPerRequest * 1000, 3);
    expect(row.monthlyCostUsd).toBeCloseTo(row.costPerRequest * 5000, 2);
    expect(result.monthlyRequests).toBe(5_000);
  });

  it("derives output tokens from a ratio when no size is given", () => {
    const result = estimateTokenCost(
      tokenEstimatorInputSchema.parse({ prompt: "x".repeat(800), outputRatio: 0.5 }),
    );

    expect(result.outputTokens).toBe(Math.round(result.inputTokens * 0.5));
  });

  it("reports the share of the context window used", () => {
    const result = estimateTokenCost(
      tokenEstimatorInputSchema.parse({
        prompt: "context ".repeat(2_000),
        expectedOutputTokens: 1_000,
        modelIds: ["deepseek-chat"],
      }),
    );

    const row = result.rows[0];
    expect(row?.fitsContext).toBe(true);
    expect(row?.contextWindow).toBe(64_000);
    expect(row?.contextUsedPct).toBeGreaterThan(0);
    expect(row?.contextUsedPct).toBeLessThan(100);
    expect(row?.contextUsedPct).toBeCloseTo((result.totalTokensPerCall / 64_000) * 100, 1);
  });

  it("sorts cheapest first and names a balanced tier", () => {
    const result = estimateTokenCost(input);

    const costs = result.rows.map((row) => row.monthlyCostUsd);
    expect(costs).toEqual([...costs].sort((a, b) => a - b));
    expect(result.cheapest?.id).toBe(result.rows[0]?.id);
    expect(result.balanced).not.toBeNull();
  });

  it("falls back to the full table when an unknown model is requested", () => {
    const result = estimateTokenCost(
      tokenEstimatorInputSchema.parse({ prompt: "hello", modelIds: ["nope"] }),
    );
    expect(result.rows).toHaveLength(modelPricing.length);
  });
});
