import { createRateLimiter, rateLimitConfigFromEnv } from "@amdhousni/core";

/**
 * One limiter per process, reused across route modules so a visitor gets a
 * single budget instead of one per endpoint. Kept on `globalThis` because dev
 * hot-reload creates new module instances.
 */
const globalForLimiter = globalThis as unknown as {
  __amdhousniLimiter?: ReturnType<typeof createRateLimiter>;
};

export const limiter =
  globalForLimiter.__amdhousniLimiter ?? createRateLimiter(rateLimitConfigFromEnv());

if (process.env.NODE_ENV !== "production") {
  globalForLimiter.__amdhousniLimiter = limiter;
}
