import { describe, expect, it } from "vitest";
import {
  cosineSimilarity,
  bm25Scores,
  DEFAULT_REFUSAL_THRESHOLD,
  inspectContext,
  ragInspectorInputSchema,
} from "../src";

const docs = [
  "Redis sorted sets hold the sliding window of request timestamps per client key.",
  "The cake recipe needs flour, butter and two eggs, baked for thirty minutes.",
  "Rate limiting returns a Retry-After header so clients back off correctly.",
];

function parse(overrides: Record<string, unknown>) {
  return ragInspectorInputSchema.parse({
    context: docs.join("\n\n"),
    question: "How does the rate limiter use Redis?",
    chunkSize: 120,
    chunkOverlap: 20,
    topK: 3,
    ...overrides,
  });
}

describe("bm25Scores", () => {
  it("ranks the relevant document first and normalises to 0–1", () => {
    const scores = bm25Scores("rate limiting retry-after", docs);

    expect(scores).toHaveLength(3);
    expect(scores[2]).toBe(1);
    expect(scores[1]).toBe(0);
    expect(Math.max(...scores)).toBeLessThanOrEqual(1);
  });

  it("returns zeros when no query term appears in the corpus", () => {
    expect(bm25Scores("quantum chromodynamics", docs)).toEqual([0, 0, 0]);
  });
});

describe("cosineSimilarity", () => {
  it("is 1 for identical vectors and 0 for orthogonal ones", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(0);
  });
});

describe("inspectContext", () => {
  it("answers with citations and selected chunks when evidence exists", () => {
    const result = inspectContext(parse({}));

    expect(result.refused).toBe(false);
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.chunks[0]?.score).toBeGreaterThanOrEqual(DEFAULT_REFUSAL_THRESHOLD);
    expect(result.answer).toContain("[Chunk");
    expect(result.retrieval).toBe("bm25");
  });

  it("refuses when nothing clears the threshold", () => {
    const result = inspectContext(parse({ question: "What is the capital of France?" }));

    expect(result.refused).toBe(true);
    expect(result.citations).toEqual([]);
    expect(result.answer.toLowerCase()).toContain("does not contain enough evidence");
    expect(result.note).toContain("threshold");
  });

  it("honours topK and reports per-chunk token counts", () => {
    const result = inspectContext(parse({ topK: 1 }));

    expect(result.chunks.filter((chunk) => chunk.selected).length).toBeLessThanOrEqual(1);
    expect(result.chunks.every((chunk) => chunk.tokens > 0)).toBe(true);
  });
});
