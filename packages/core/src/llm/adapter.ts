import type { z } from "zod";

/**
 * One adapter for every OpenAI-compatible provider.
 *
 * OpenAI, OpenRouter, Groq, DeepSeek, Qwen and Gemini's compatibility endpoint
 * all speak the same chat-completions shape, so the difference between them is
 * configuration (`LLM_BASE_URL`, `LLM_MODEL`), not code.
 *
 * The adapter never throws for an upstream problem: it returns a typed failure
 * so the caller can fall back deterministically and label the response.
 */

export const DEFAULT_LLM_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_LLM_MODEL = "gpt-4o-mini";
export const DEFAULT_LLM_TIMEOUT_MS = 15_000;

export type LlmConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  embeddingsModel: string | null;
};

export type LlmEnv = Record<string, string | undefined>;

export function resolveLlmConfig(
  env: LlmEnv = process.env,
  overrides: Partial<LlmConfig> = {},
): LlmConfig {
  const timeoutFromEnv = Number.parseInt(env.LLM_TIMEOUT_MS ?? "", 10);

  return {
    apiKey: overrides.apiKey ?? env.LLM_API_KEY?.trim() ?? "",
    baseUrl: (overrides.baseUrl ?? env.LLM_BASE_URL?.trim() ?? DEFAULT_LLM_BASE_URL).replace(
      /\/$/,
      "",
    ),
    model: overrides.model ?? env.LLM_MODEL?.trim() ?? DEFAULT_LLM_MODEL,
    timeoutMs:
      overrides.timeoutMs ??
      (Number.isFinite(timeoutFromEnv) && timeoutFromEnv > 0 ? timeoutFromEnv : DEFAULT_LLM_TIMEOUT_MS),
    embeddingsModel:
      overrides.embeddingsModel ?? (env.LLM_EMBEDDINGS_MODEL?.trim() || null),
  };
}

export function isLlmConfigured(config: LlmConfig): boolean {
  return config.apiKey.length > 0;
}

export type LlmUsage = { inputTokens: number; outputTokens: number; model: string };

export type LlmFailureReason =
  | "not_configured"
  | "provider_error"
  | "timeout"
  | "invalid_output"
  | "aborted";

export type LlmResult<T> =
  | { ok: true; data: T; usage: LlmUsage }
  | { ok: false; reason: LlmFailureReason; detail?: string };

type ChatPayload = {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

function extractJson(raw: string): unknown {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

/**
 * POST a JSON-mode completion and validate it against a Zod schema.
 *
 * `timeoutMs` is enforced with an AbortController rather than a race, so the
 * socket is actually released when a provider stalls.
 */
export async function completeJson<T>(options: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  config: LlmConfig;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}): Promise<LlmResult<T>> {
  const { system, user, schema, config, maxTokens = 800, temperature = 0.2 } = options;

  if (!isLlmConfigured(config)) {
    return { ok: false, reason: "not_configured" };
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, config.timeoutMs);

  const forwardAbort = () => controller.abort();
  options.signal?.addEventListener("abort", forwardAbort);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { ok: false, reason: "provider_error", detail: detail.slice(0, 300) };
    }

    const payload = (await response.json()) as ChatPayload;
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      return { ok: false, reason: "invalid_output", detail: "empty completion" };
    }

    const parsed = extractJson(content);
    if (parsed === null) {
      return { ok: false, reason: "invalid_output", detail: "response was not JSON" };
    }

    const validated = schema.safeParse(parsed);
    if (!validated.success) {
      return {
        ok: false,
        reason: "invalid_output",
        detail: validated.error.issues[0]?.message ?? "schema validation failed",
      };
    }

    return {
      ok: true,
      data: validated.data,
      usage: {
        inputTokens: payload.usage?.prompt_tokens ?? 0,
        outputTokens: payload.usage?.completion_tokens ?? 0,
        model: config.model,
      },
    };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const aborted = name === "AbortError" || name === "TimeoutError";
    return {
      ok: false,
      reason: timedOut ? "timeout" : aborted ? "aborted" : "provider_error",
      detail: error instanceof Error ? error.message.slice(0, 200) : undefined,
    };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", forwardAbort);
  }
}

/**
 * Optional embeddings call, used by the RAG inspector when a model is
 * configured for it. Returns null when the provider does not answer, so the
 * caller can keep the lexical retrieval path instead of failing.
 */
export async function embedTexts(
  texts: string[],
  config: LlmConfig,
  signal?: AbortSignal,
): Promise<number[][] | null> {
  if (!isLlmConfigured(config) || !config.embeddingsModel) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener("abort", forwardAbort);

  try {
    const response = await fetch(`${config.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ model: config.embeddingsModel, input: texts }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as { data?: { embedding?: number[] }[] };
    const vectors = payload.data?.map((item) => item.embedding ?? []);
    if (!vectors || vectors.length !== texts.length || vectors.some((v) => v.length === 0)) {
      return null;
    }
    return vectors;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forwardAbort);
  }
}

/** Human-readable reason, rendered in the UI next to the fallback badge. */
export function failureNote(reason: LlmFailureReason): string {
  switch (reason) {
    case "not_configured":
      return "No LLM_API_KEY is configured, so the deterministic engine answered instead.";
    case "timeout":
      return "The provider exceeded the 15s timeout, so the deterministic engine answered instead.";
    case "invalid_output":
      return "The model returned output that failed schema validation, so the deterministic engine answered instead.";
    case "aborted":
      return "The request was cancelled, so the deterministic engine answered instead.";
    default:
      return "The provider returned an error, so the deterministic engine answered instead.";
  }
}
