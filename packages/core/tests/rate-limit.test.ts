import { describe, expect, it } from "vitest";
import {
  clientKeyFromHeaders,
  createRateLimiter,
  MemorySlidingWindow,
  rateLimitConfigFromEnv,
} from "../src";

describe("MemorySlidingWindow", () => {
  it("allows the limit, then blocks with a retry hint", () => {
    const limiter = new MemorySlidingWindow(3, 1_000);
    const now = 1_700_000_000_000;

    const first = limiter.consume("route:1.2.3.4", now);
    expect(first.ok).toBe(true);
    expect(first.remaining).toBe(2);

    limiter.consume("route:1.2.3.4", now + 10);
    const third = limiter.consume("route:1.2.3.4", now + 20);
    expect(third.remaining).toBe(0);

    const blocked = limiter.consume("route:1.2.3.4", now + 30);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.backend).toBe("memory");
  });

  it("counts each key independently", () => {
    const limiter = new MemorySlidingWindow(1, 1_000);
    expect(limiter.consume("a", 0).ok).toBe(true);
    expect(limiter.consume("a", 0).ok).toBe(false);
    expect(limiter.consume("b", 0).ok).toBe(true);
  });

  it("slides: hits older than the window stop counting", () => {
    const limiter = new MemorySlidingWindow(2, 1_000);
    limiter.consume("k", 0);
    limiter.consume("k", 100);

    expect(limiter.consume("k", 900).ok).toBe(false);
    // At t=1001 the first hit has left the window, the second has not.
    expect(limiter.consume("k", 1_001).ok).toBe(true);
  });

  it("reports a reset time inside the future", () => {
    const limiter = new MemorySlidingWindow(1, 5_000);
    const result = limiter.consume("k", 10_000);
    expect(result.resetAtMs).toBe(15_000);
  });
});

describe("createRateLimiter", () => {
  it("defaults to the in-memory backend when REDIS_URL is absent", async () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1_000 });
    expect(limiter.backend).toBe("memory");

    expect((await limiter.consume("k")).ok).toBe(true);
    expect((await limiter.consume("k")).ok).toBe(true);
    const blocked = await limiter.consume("k");
    expect(blocked.ok).toBe(false);
  });

  it("keeps working when the Redis URL is malformed", async () => {
    // The adapter loads ioredis lazily and degrades to memory on any failure,
    // so a bad URL must not take the endpoint down.
    const limiter = createRateLimiter({
      limit: 2,
      windowMs: 1_000,
      redisUrl: "not-a-redis-url",
    });

    const first = await limiter.consume("k");
    expect(first.ok).toBe(true);
    expect(first.backend).toBe("memory");
  });
});

describe("client identity", () => {
  it("prefers edge headers over a spoofable client value", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.9",
      "x-forwarded-for": "10.0.0.1, 10.0.0.2",
    });

    expect(clientKeyFromHeaders(headers, "rag")).toBe("rag:203.0.113.9");
  });

  it("reads configuration from the environment with sane defaults", () => {
    expect(rateLimitConfigFromEnv({})).toEqual({
      limit: 20,
      windowMs: 300_000,
      redisUrl: undefined,
    });

    expect(
      rateLimitConfigFromEnv({ RATE_LIMIT_MAX: "7", RATE_LIMIT_WINDOW_SECONDS: "60" }),
    ).toEqual({ limit: 7, windowMs: 60_000, redisUrl: undefined });
  });
});
