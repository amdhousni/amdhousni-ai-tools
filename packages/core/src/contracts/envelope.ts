import { z } from "zod";

/**
 * Every tool answers with the same envelope, whatever happened upstream.
 *
 * `mode` is the honesty switch: the interface can always tell the visitor
 * whether a model produced the answer or the deterministic engine did.
 */
export const toolModeSchema = z.enum(["live", "deterministic-fallback"]);
export type ToolMode = z.infer<typeof toolModeSchema>;

export const tokenUsageSchema = z.object({
  input: z.number().int().nonnegative(),
  output: z.number().int().nonnegative(),
});
export type TokenUsage = z.infer<typeof tokenUsageSchema>;

export const responseMetaSchema = z.object({
  /** Wall-clock time spent inside the route handler. */
  latencyMs: z.number().nonnegative(),
  /** Model id, or "deterministic" when no provider was called. */
  model: z.string().min(1),
  estimatedTokens: tokenUsageSchema,
  /** Cost of this request only — not the modelled cost of the visitor's workload. */
  estimatedCostUsd: z.number().nonnegative(),
  rateLimitRemaining: z.number().int().nonnegative(),
});
export type ResponseMeta = z.infer<typeof responseMetaSchema>;

export function envelopeSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    ok: z.literal(true),
    mode: toolModeSchema,
    meta: responseMetaSchema,
    data,
  });
}

export type ToolEnvelope<T> = {
  ok: true;
  mode: ToolMode;
  meta: ResponseMeta;
  data: T;
};

export const errorBodySchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  message: z.string(),
});
export type ToolErrorBody = z.infer<typeof errorBodySchema>;

export function buildEnvelope<T>(input: {
  mode: ToolMode;
  meta: ResponseMeta;
  data: T;
}): ToolEnvelope<T> {
  return { ok: true, mode: input.mode, meta: input.meta, data: input.data };
}

export function errorBody(error: string, message: string): ToolErrorBody {
  return { ok: false, error, message };
}
