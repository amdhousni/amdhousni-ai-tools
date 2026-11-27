import type { z } from "zod";
import {
  buildEnvelope,
  clientKeyFromHeaders,
  errorBody,
  estimateCostUsd,
  type RateLimitResult,
  type ToolMode,
} from "@amdhousni/core";
import { limiter } from "@/lib/limiter";

/**
 * The pipeline every tool shares.
 *
 * Order matters and is deliberate: cheaper checks first, expensive work last.
 *   same-origin → body ceiling → rate limit → Zod → engine → typed envelope
 */

const MAX_BODY_BYTES = 64 * 1024;

export type ToolRunResult<T> = {
  mode: ToolMode;
  /** Model id, or "deterministic". */
  model: string;
  data: T;
  inputTokens: number;
  outputTokens: number;
};

export type ToolRunContext = {
  request: Request;
  signal: AbortSignal;
};

type HandlerOptions<TInput, TOutput> = {
  route: string;
  schema: z.ZodType<TInput>;
  run: (
    input: TInput,
    context: ToolRunContext,
  ) => Promise<ToolRunResult<TOutput>> | ToolRunResult<TOutput>;
};

function rateHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "x-ratelimit-limit": String(result.limit),
    "x-ratelimit-remaining": String(result.remaining),
    "x-ratelimit-reset": String(Math.ceil(result.resetAtMs / 1000)),
  };
}

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

/**
 * Cross-site POST protection. `sec-fetch-site` is sent by modern browsers; when
 * it is absent (curl, some proxies) the Origin/Host comparison does the work,
 * and a request with neither is allowed through to the rate limiter.
 */
function isSameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none" && site !== "same-site") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originHost = new URL(origin).host;
    const requestHost = request.headers.get("host");
    return !requestHost || originHost === requestHost;
  } catch {
    return false;
  }
}

export async function handleTool<TInput, TOutput>(
  request: Request,
  options: HandlerOptions<TInput, TOutput>,
): Promise<Response> {
  if (!isSameOrigin(request)) {
    return json(
      errorBody("cross_origin_blocked", "This endpoint only accepts same-origin requests."),
      403,
    );
  }

  const contentLength = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json(errorBody("payload_too_large", "Request body is too large (64 kB maximum)."), 413);
  }

  const startedAt = Date.now();
  const limit = await limiter.consume(clientKeyFromHeaders(request.headers, options.route));

  if (!limit.ok) {
    return json(
      errorBody(
        "rate_limited",
        `Rate limit reached. Try again in ${limit.retryAfterSeconds} seconds.`,
      ),
      429,
      { "retry-after": String(limit.retryAfterSeconds), ...rateHeaders(limit) },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json(errorBody("invalid_json", "Request body must be valid JSON."), 400, rateHeaders(limit));
  }

  const parsed = options.schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".") ?? "";
    return json(
      errorBody(
        "invalid_input",
        issue ? `${path ? `${path}: ` : ""}${issue.message}` : "Input failed validation.",
      ),
      400,
      rateHeaders(limit),
    );
  }

  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  request.signal.addEventListener("abort", forwardAbort);

  try {
    const result = await options.run(parsed.data, { request, signal: controller.signal });

    const envelope = buildEnvelope({
      mode: result.mode,
      meta: {
        latencyMs: Date.now() - startedAt,
        model: result.model,
        estimatedTokens: { input: result.inputTokens, output: result.outputTokens },
        estimatedCostUsd:
          result.mode === "live"
            ? estimateCostUsd(result.model, {
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
              })
            : 0,
        rateLimitRemaining: limit.remaining,
      },
      data: result.data,
    });

    return json(envelope, 200, rateHeaders(limit));
  } catch (error) {
    console.error(`[tool:${options.route}]`, error);
    return json(
      errorBody("tool_failed", "The tool could not complete this request. Try again."),
      500,
      rateHeaders(limit),
    );
  } finally {
    request.signal.removeEventListener("abort", forwardAbort);
  }
}
