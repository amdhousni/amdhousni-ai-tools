import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* 1. Token & cost estimator — deterministic by design                         */
/* -------------------------------------------------------------------------- */

export const tokenEstimatorInputSchema = z.object({
  prompt: z.string().min(1, "Paste a prompt to estimate.").max(20_000),
  systemPrompt: z.string().max(8_000).optional(),
  /** Explicit output size, or a ratio of the input when omitted. */
  expectedOutputTokens: z.number().int().min(0).max(16_000).optional(),
  outputRatio: z.number().min(0.05).max(5).optional(),
  monthlyRequests: z.number().int().min(1).max(10_000_000).optional(),
  /** Optional subset of the pricing table, by model id. */
  modelIds: z.array(z.string().min(1)).max(12).optional(),
});
export type TokenEstimatorInput = z.infer<typeof tokenEstimatorInputSchema>;

/* -------------------------------------------------------------------------- */
/* 2. Structured JSON & schema extractor                                       */
/* -------------------------------------------------------------------------- */

export const extractorPresetSchema = z.enum(["email", "listing", "invoice", "ticket"]);
export type ExtractorPreset = z.infer<typeof extractorPresetSchema>;

export const jsonExtractorInputSchema = z.object({
  text: z.string().min(1, "Paste some text to extract from.").max(20_000),
  hints: z.array(z.string().min(1).max(40)).max(8).optional(),
  preset: extractorPresetSchema.optional(),
});
export type JsonExtractorInput = z.infer<typeof jsonExtractorInputSchema>;

/** Shape the model must return in live mode. */
export const extractorModelOutputSchema = z.object({
  summary: z.string().min(1).max(600),
  fields: z.record(z.string(), z.unknown()),
  notes: z.array(z.string().max(400)).max(8).default([]),
});
export type ExtractorModelOutput = z.infer<typeof extractorModelOutputSchema>;

/* -------------------------------------------------------------------------- */
/* 3. Role / JD fit & gap analyser                                             */
/* -------------------------------------------------------------------------- */

export const fitPresetSchema = z.enum(["fullstack-lead", "ai-rag-engineer", "founding-engineer"]);
export type FitPreset = z.infer<typeof fitPresetSchema>;

export const jdFitInputSchema = z.object({
  jobDescription: z
    .string()
    .min(20, "Paste at least a few lines of the job description.")
    .max(20_000),
  preset: fitPresetSchema.optional(),
});
export type JdFitInput = z.infer<typeof jdFitInputSchema>;

export const fitModelOutputSchema = z.object({
  coverageScore: z.number().min(0).max(100),
  matchedSkills: z
    .array(z.object({ skill: z.string().min(1), evidence: z.string().min(1).max(400) }))
    .max(20),
  gaps: z.array(z.object({ skill: z.string().min(1), why: z.string().min(1).max(400) })).max(20),
  interviewAngles: z.array(z.string().min(1).max(400)).max(8),
});
export type FitModelOutput = z.infer<typeof fitModelOutputSchema>;

/* -------------------------------------------------------------------------- */
/* 4. RAG & context Q&A inspector                                              */
/* -------------------------------------------------------------------------- */

export const ragInspectorInputSchema = z.object({
  context: z.string().min(20, "Paste the source context first.").max(40_000),
  question: z.string().min(3, "Ask a question about the context.").max(400),
  chunkSize: z.number().int().min(40).max(800).default(160),
  chunkOverlap: z.number().int().min(0).max(400).default(32),
  topK: z.number().int().min(1).max(8).default(4),
});
export type RagInspectorInput = z.infer<typeof ragInspectorInputSchema>;

export const ragModelOutputSchema = z.object({
  answer: z.string().min(1).max(2000),
  citations: z
    .array(z.object({ chunkId: z.string().min(1).max(24), quote: z.string().max(400) }))
    .max(8),
  refused: z.boolean(),
});
export type RagModelOutput = z.infer<typeof ragModelOutputSchema>;
