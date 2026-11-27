import {
  ragModelOutputSchema,
  type RagInspectorInput,
} from "../../contracts/tools";
import { completeJson, type LlmConfig, type LlmUsage } from "../../llm/adapter";
import { bestSentence, splitSentences, tokenize } from "../../util/text";
import { estimateTokens, round } from "../../util/tokens";

/**
 * A retrieval inspector, not a chatbot.
 *
 * The chunker, the scorer and the refusal threshold are all visible and
 * configurable, because the interesting question about a RAG system is never
 * "did it answer" — it is "what did it retrieve, and should it have answered at
 * all".
 */

export const DEFAULT_REFUSAL_THRESHOLD = 0.18;

export type RagChunk = {
  id: string;
  rank: number;
  text: string;
  tokens: number;
  /** Normalised relevance, 0–1. */
  score: number;
  excerpt: string;
  selected: boolean;
};

export type RagCitation = { chunkId: string; quote: string };

export type RagResult = {
  answer: string;
  citations: RagCitation[];
  chunks: RagChunk[];
  refused: boolean;
  threshold: number;
  topK: number;
  chunkSize: number;
  chunkOverlap: number;
  retrieval: "bm25" | "embeddings";
  note: string;
  method: "model" | "rules";
};

export const ragSamples = [
  {
    id: "chunking",
    label: "Chunking strategy",
    context: `Chunking decides what retrieval can possibly find. A chunk is the smallest unit of evidence the model is allowed to cite, so the split has to respect the document's own structure before it respects a token budget.

Fixed-size splitting ignores that structure. A 512-token window cut every 512 tokens will separate a heading from its table, and the retriever then returns a fragment that reads well but answers nothing.

Overlap exists to protect boundaries. When a chunk ends mid-argument, the first sentences of the next chunk are repeated so a retrieved chunk still carries the conclusion of the previous one. Overlap costs storage and tokens, so 10 to 20 percent of the chunk size is the usual compromise.

Small chunks retrieve precisely and answer poorly; large chunks answer well and retrieve loosely. The production pattern is to retrieve small, then expand to the parent section before generating.

Chunk size must be measured on the embedding model's tokenizer, not on characters. A Thai or Arabic document can consume three to four times the tokens of the same text in English.`,
  },
  {
    id: "rate-limits",
    label: "Rate limiting",
    context: `A fixed window counter resets on a clock boundary. It is cheap, but it allows a burst twice the limit: one request at 11:59:59 and another at 12:00:00 both pass because they land in different windows.

A sliding window keeps the timestamps of recent requests and counts only those inside the window. Memory grows with traffic, so implementations cap the retained set or switch to a sorted set in Redis.

Redis sorted sets make the window shared across instances: remove entries older than the window, add the current request, count the set, and expire the key. The whole sequence runs in a pipeline or a Lua script so two instances cannot interleave.

The limiter must return a Retry-After value. A client that does not know when to retry will retry immediately and make the problem worse.

Rate limiting is not a security control. It reduces accidental load and casual abuse; it does not stop a distributed attacker, and it should never be the only thing protecting an expensive endpoint.`,
  },
  {
    id: "json-schema",
    label: "Structured output",
    context: `Asking a model for JSON in prose is a request, not a guarantee. The response can carry markdown fences, a trailing explanation, or a field that was renamed halfway through the document.

JSON mode constrains the decoder so the output parses. It does not constrain the shape: the same prompt can return "total" as a number in one call and as a string in the next.

Validation closes that gap. Parse the response, validate it against a schema, and reject anything that does not conform. A rejected response is a signal to fall back, retry with a clearer instruction, or surface the failure — not a reason to cast the value and hope.

When the schema is generated from the payload, the two cannot disagree. That is the honest version of "structured output": derive the schema from the object you validated, not from the prompt you wrote.

Every field that was inferred rather than copied should be labelled. Confidence notes cost ten lines of code and prevent a downstream consumer from treating a guess as a fact.`,
  },
];

/** Sentence-aware chunker with a token budget and token-measured overlap. */
export function chunkText(text: string, chunkSize: number, chunkOverlap: number): string[] {
  const overlap = Math.min(chunkOverlap, Math.max(0, Math.floor(chunkSize * 0.5)));
  const sentences = splitSentences(text);
  const chunks: string[] = [];

  let current: string[] = [];
  let currentTokens = 0;

  const flush = () => {
    const joined = current.join(" ").trim();
    if (joined) chunks.push(joined);
  };

  for (const sentence of sentences) {
    const tokens = estimateTokens(sentence);

    if (tokens > chunkSize) {
      flush();
      current = [];
      currentTokens = 0;

      let buffer: string[] = [];
      for (const word of sentence.split(/\s+/)) {
        buffer.push(word);
        if (estimateTokens(buffer.join(" ")) >= chunkSize) {
          chunks.push(buffer.join(" ").trim());
          buffer = [];
        }
      }
      if (buffer.length > 0) {
        current = [buffer.join(" ")];
        currentTokens = estimateTokens(current[0] ?? "");
      }
      continue;
    }

    if (currentTokens + tokens > chunkSize && current.length > 0) {
      flush();

      const carry: string[] = [];
      let carryTokens = 0;
      for (let index = current.length - 1; index >= 0; index -= 1) {
        const candidate = current[index];
        if (candidate === undefined) break;
        const candidateTokens = estimateTokens(candidate);
        if (carryTokens + candidateTokens > overlap) break;
        carry.unshift(candidate);
        carryTokens += candidateTokens;
      }

      current = carry;
      currentTokens = carryTokens;
    }

    current.push(sentence);
    currentTokens += tokens;
  }

  flush();

  return chunks.filter(Boolean);
}

/** Okapi BM25 over tokenised chunks, normalised to 0–1 for display. */
export function bm25Scores(query: string, documents: string[], k1 = 1.5, b = 0.75): number[] {
  if (documents.length === 0) return [];

  const queryTerms = Array.from(new Set(tokenize(query)));
  const docs = documents.map((document) => tokenize(document));
  const total = docs.reduce((sum, terms) => sum + terms.length, 0);
  const averageLength = docs.length > 0 ? total / docs.length : 1;

  const documentFrequency = new Map<string, number>();
  for (const terms of docs) {
    for (const term of new Set(terms)) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }

  const raw = docs.map((terms) => {
    const frequencies = new Map<string, number>();
    for (const term of terms) frequencies.set(term, (frequencies.get(term) ?? 0) + 1);

    let score = 0;
    for (const term of queryTerms) {
      const frequency = frequencies.get(term) ?? 0;
      if (frequency === 0) continue;

      const df = documentFrequency.get(term) ?? 0;
      const idf = Math.log(1 + (docs.length - df + 0.5) / (df + 0.5));
      const lengthRatio = terms.length / (averageLength || 1);
      score += idf * ((frequency * (k1 + 1)) / (frequency + k1 * (1 - b + b * lengthRatio)));
    }
    return score;
  });

  const max = Math.max(...raw, 0);
  return raw.map((score) => (max > 0 ? round(score / max, 3) : 0));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    dot += left * right;
    normA += left * left;
    normB += right * right;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function buildChunks(
  texts: string[],
  scores: number[],
  question: string,
  topK: number,
): RagChunk[] {
  const questionTerms = Array.from(new Set(tokenize(question)));

  return texts
    .map((text, index) => ({
      id: `c${index + 1}`,
      text,
      tokens: estimateTokens(text),
      rawScore: scores[index] ?? 0,
      excerpt: bestSentence(text, questionTerms),
    }))
    .sort((a, b) => b.rawScore - a.rawScore)
    .map((chunk, index) => ({
      id: chunk.id,
      rank: index + 1,
      text: chunk.text,
      tokens: chunk.tokens,
      score: round(chunk.rawScore, 3),
      excerpt: chunk.excerpt,
      selected: index < topK && chunk.rawScore > 0,
    }));
}

function extractiveAnswer(chunks: RagChunk[], threshold: number): { answer: string; citations: RagCitation[] } {
  const usable = chunks.filter((chunk) => chunk.selected && chunk.score >= threshold).slice(0, 3);

  if (usable.length === 0) {
    return {
      answer:
        "The provided context does not contain enough evidence to answer this question. Rather than guess, the inspector stops here — add the missing source or rephrase the question.",
      citations: [],
    };
  }

  const citations = usable.map((chunk) => ({ chunkId: chunk.id, quote: chunk.excerpt }));
  const answer = usable
    .map((chunk, index) => `${chunk.excerpt} [Chunk ${chunk.id.replace("c", "")}]${index === usable.length - 1 ? "" : " "}`)
    .join("")
    .trim();

  return { answer, citations };
}

export function inspectContext(
  input: RagInspectorInput,
  options: { vectors?: number[][] } = {},
): RagResult {
  const texts = chunkText(input.context, input.chunkSize, input.chunkOverlap);
  // The caller passes one vector per chunk plus the question vector last.
  const retrieval: "bm25" | "embeddings" =
    options.vectors && options.vectors.length === texts.length + 1 ? "embeddings" : "bm25";

  let scores: number[];
  if (retrieval === "embeddings" && options.vectors) {
    const queryVector = options.vectors[options.vectors.length - 1] ?? [];
    if (queryVector.length === 0) {
      scores = bm25Scores(input.question, texts);
    } else {
      scores = texts.map((_text, index) => {
        const vector = options.vectors?.[index] ?? [];
        return round(Math.max(0, cosineSimilarity(queryVector, vector)), 3);
      });
    }
  } else {
    scores = bm25Scores(input.question, texts);
  }

  const chunks = buildChunks(texts, scores, input.question, input.topK);
  const top = chunks[0]?.score ?? 0;
  const refused = top < DEFAULT_REFUSAL_THRESHOLD;
  const { answer, citations } = refused
    ? { answer: extractiveAnswer([], DEFAULT_REFUSAL_THRESHOLD).answer, citations: [] }
    : extractiveAnswer(chunks, DEFAULT_REFUSAL_THRESHOLD);

  return {
    answer,
    citations,
    chunks,
    refused,
    threshold: DEFAULT_REFUSAL_THRESHOLD,
    topK: input.topK,
    chunkSize: input.chunkSize,
    chunkOverlap: input.chunkOverlap,
    retrieval,
    note: refused
      ? `No chunk reached the ${DEFAULT_REFUSAL_THRESHOLD} relevance threshold (best: ${round(top, 3)}). The inspector refuses rather than answering from weak evidence.`
      : `Top ${Math.min(input.topK, chunks.length)} of ${chunks.length} chunks selected with ${retrieval === "bm25" ? "BM25 lexical" : "embedding cosine"} scoring.`,
    method: "rules",
  };
}

const SYSTEM_PROMPT = `You answer a question using ONLY the numbered context chunks provided.

Return JSON only:
{"answer": string, "citations": [{"chunkId": "c1", "quote": string}], "refused": boolean}

Rules:
- Every factual sentence must be supported by a chunk you cite. Inline citation markers like [Chunk 1] are welcome in the answer.
- If the chunks do not support an answer, set refused to true and say what is missing. Do not use outside knowledge.
- chunkId must be one of the ids provided. Never invent an id.
- quote must be a verbatim fragment of that chunk, under 240 characters.`;

export async function answerWithModel(
  input: RagInspectorInput,
  base: RagResult,
  options: { config: LlmConfig; signal?: AbortSignal },
): Promise<{ result: RagResult; usage: LlmUsage } | { failure: string } | null> {
  const selected = base.chunks.filter((chunk) => chunk.selected).slice(0, input.topK);
  if (selected.length === 0) return null;

  const context = selected
    .map((chunk) => `[${chunk.id}] (relevance ${chunk.score})\n${chunk.text}`)
    .join("\n\n");

  const response = await completeJson({
    system: SYSTEM_PROMPT,
    user: `Question: ${input.question}\n\nContext chunks:\n${context}`,
    schema: ragModelOutputSchema,
    config: options.config,
    maxTokens: 700,
    signal: options.signal,
  });

  if (!response.ok) return { failure: response.reason };

  const validIds = new Set(selected.map((chunk) => chunk.id));
  const citations = response.data.citations
    .filter((citation) => validIds.has(citation.chunkId))
    .slice(0, 4)
    .map((citation) => ({ chunkId: citation.chunkId, quote: citation.quote.slice(0, 240) }));

  const rejectedCitations = response.data.citations.length - citations.length;

  return {
    usage: response.usage,
    result: {
      ...base,
      answer: response.data.answer,
      citations,
      refused: response.data.refused || citations.length === 0,
      note: rejectedCitations > 0
        ? `${rejectedCitations} citation${rejectedCitations === 1 ? "" : "s"} referenced a chunk id that was not in the request and ${rejectedCitations === 1 ? "was" : "were"} dropped before rendering.`
        : base.note,
      method: "model",
    },
  };
}

/** Used by the UI to show how much context the chunker was given. */
export function chunkStats(result: RagResult): { chunks: number; tokens: number; medianTokens: number } {
  const tokenCounts = result.chunks.map((chunk) => chunk.tokens).sort((a, b) => a - b);
  const middle = tokenCounts[Math.floor(tokenCounts.length / 2)] ?? 0;
  return {
    chunks: result.chunks.length,
    tokens: tokenCounts.reduce((sum, value) => sum + value, 0),
    medianTokens: middle,
  };
}
