import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  buildEnvelope,
  errorBody,
  errorBodySchema,
  envelopeSchema,
  jsonExtractorInputSchema,
  jdFitInputSchema,
  ragInspectorInputSchema,
  tokenEstimatorInputSchema,
} from "../src";

const dataSchema = z.object({ score: z.number() });
const contract = envelopeSchema(dataSchema);

const envelope = buildEnvelope({
  mode: "deterministic-fallback",
  meta: {
    latencyMs: 12,
    model: "deterministic",
    estimatedTokens: { input: 120, output: 40 },
    estimatedCostUsd: 0,
    rateLimitRemaining: 19,
  },
  data: { score: 91 },
});

describe("response envelope", () => {
  it("validates a well-formed envelope", () => {
    const parsed = contract.parse(envelope);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.score).toBe(91);
    expect(parsed.meta.rateLimitRemaining).toBe(19);
  });

  it("rejects an unknown mode", () => {
    expect(() => contract.parse({ ...envelope, mode: "demo" })).toThrow();
    expect(() => contract.parse({ ...envelope, mode: "fallback" })).toThrow();
  });

  it("rejects negative counters and costs", () => {
    expect(() =>
      contract.parse({
        ...envelope,
        meta: { ...envelope.meta, rateLimitRemaining: -1 },
      }),
    ).toThrow();

    expect(() =>
      contract.parse({ ...envelope, meta: { ...envelope.meta, estimatedCostUsd: -0.1 } }),
    ).toThrow();
  });

  it("rejects a payload that does not match the data schema", () => {
    expect(() => contract.parse({ ...envelope, data: { score: "91" } })).toThrow();
  });

  it("keeps errors in a separate, parseable shape", () => {
    const body = errorBody("rate_limited", "Rate limit reached. Try again in 42 seconds.");
    expect(errorBodySchema.parse(body)).toEqual(body);
  });
});

describe("input validation", () => {
  it("requires a non-empty prompt", () => {
    expect(tokenEstimatorInputSchema.safeParse({ prompt: "" }).success).toBe(false);
    expect(tokenEstimatorInputSchema.safeParse({ prompt: "hello" }).success).toBe(true);
  });

  it("caps extractor hints and rejects overlong text", () => {
    expect(
      jsonExtractorInputSchema.safeParse({
        text: "x",
        hints: Array.from({ length: 9 }, (_, index) => `field_${index}`),
      }).success,
    ).toBe(false);

    expect(jsonExtractorInputSchema.safeParse({ text: "x".repeat(20_001) }).success).toBe(false);
  });

  it("requires a substantive job description", () => {
    expect(jdFitInputSchema.safeParse({ jobDescription: "short" }).success).toBe(false);
    expect(
      jdFitInputSchema.safeParse({
        jobDescription: "We need a full-stack engineer with TypeScript and PostgreSQL experience.",
      }).success,
    ).toBe(true);
  });

  it("applies retrieval defaults and bounds", () => {
    const parsed = ragInspectorInputSchema.parse({
      context: "A long enough piece of source context for the inspector.",
      question: "What does it say?",
    });

    expect(parsed.chunkSize).toBe(160);
    expect(parsed.chunkOverlap).toBe(32);
    expect(parsed.topK).toBe(4);

    expect(
      ragInspectorInputSchema.safeParse({ context: "too short", question: "hi" }).success,
    ).toBe(false);
  });
});
