import { describe, expect, it } from "vitest";
import { chunkText } from "../src/tools/rag-inspector";
import { estimateTokens } from "../src/util/tokens";

const sentences = [
  "Sentence one is about alpha.", // ~7 tokens
  "Sentence two covers beta and gamma.",
  "Sentence three returns to alpha again.",
  "Sentence four closes the argument.",
  "Sentence five adds a caveat.",
];

describe("chunkText", () => {
  it("splits on sentences and respects the token budget", () => {
    const chunks = chunkText(sentences.join(" "), 20, 0);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      // A chunk may overshoot by the last sentence it accepted, never by more.
      expect(estimateTokens(chunk)).toBeLessThanOrEqual(20 + 12);
    }
  });

  it("carries an overlap measured in tokens, not sentences", () => {
    // overlap 12 fits the ~9-token second sentence, so chunk 2 must begin with it.
    const chunks = chunkText(sentences.join(" "), 20, 12);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[1]?.startsWith(sentences[1] ?? "")).toBe(true);

    // overlap 8 cannot fit that sentence, so nothing is carried over.
    const tight = chunkText(sentences.join(" "), 20, 8);
    expect(tight[1]?.startsWith(sentences[2] ?? "")).toBe(true);
  });

  it("hard-splits a single sentence longer than the budget", () => {
    const long = Array.from({ length: 200 }, (_, index) => `word${index}`).join(" ");
    const chunks = chunkText(long, 40, 0);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length > 0)).toBe(true);
    expect(chunks.join(" ")).toContain("word0");
    expect(chunks.join(" ")).toContain("word199");
  });

  it("returns no chunk for empty input", () => {
    expect(chunkText("   \n\n  ", 100, 10)).toEqual([]);
  });

  it("never lets overlap exceed half the chunk size", () => {
    // overlap 400 > chunkSize 60: the clamp must still terminate.
    const chunks = chunkText(sentences.join(" ").repeat(4), 60, 400);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.length).toBeLessThan(40);
  });
});
