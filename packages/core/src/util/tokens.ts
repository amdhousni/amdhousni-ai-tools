/**
 * Token estimation without a tokenizer.
 *
 * Latin text averages ~4 characters per token; word density catches
 * punctuation-heavy prose. Non-ASCII characters (Thai, Arabic, CJK) are counted
 * individually because they tokenize far less efficiently. Expect ±10–15% on
 * prose and more on code — this is documented, not hidden.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  const nonAscii = (text.match(/[\u{80}-\u{10FFFF}]/gu) ?? []).length;
  const asciiLength = text.replace(/[\u{80}-\u{10FFFF}]/gu, "").length;
  const words = text.trim().split(/\s+/).filter(Boolean).length;

  const latin = Math.max(Math.ceil(asciiLength / 4), Math.ceil(words * 1.3));
  return latin + nonAscii;
}

/** Round to a fixed number of decimals without floating-point noise. */
export function round(value: number, decimals = 6): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatUsd(value: number): string {
  if (value === 0) return "$0.00";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
