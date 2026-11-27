/**
 * Small text utilities shared by retrieval scoring and the extractor.
 *
 * Everything here is deterministic and dependency-free so the fallback paths
 * are testable without a provider key.
 */

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "than", "that", "this", "these", "those",
  "is", "are", "was", "were", "be", "been", "being", "to", "of", "in", "on", "at", "for", "with",
  "by", "from", "as", "it", "its", "we", "you", "they", "he", "she", "i", "not", "no", "do",
  "does", "did", "can", "could", "should", "would", "will", "what", "which", "who", "how", "when",
  "where", "why", "there", "their", "our", "your", "my", "me", "us", "them", "about", "into",
  "over", "under", "after", "before", "between", "each", "any", "all", "some", "more", "most",
  "other", "such", "only", "own", "same", "so", "too", "very", "just", "also", "per",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** Sentence in `text` that overlaps `terms` the most, not merely the first. */
export function bestSentence(text: string, terms: string[], maxLength = 240): string {
  const parts = splitSentences(text);
  if (parts.length === 0) return text.slice(0, maxLength);

  let best = parts[0] ?? "";
  let bestHits = -1;

  for (const part of parts) {
    const words = new Set(tokenize(part));
    const hits = terms.reduce((total, term) => (words.has(term) ? total + 1 : total), 0);
    if (hits > bestHits) {
      best = part;
      bestHits = hits;
    }
  }

  return best.length > maxLength ? `${best.slice(0, maxLength).trimEnd()}…` : best;
}
