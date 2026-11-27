/**
 * Sliding-window rate limiting.
 *
 * Two backends behind one interface:
 *   - Redis / Valkey (sorted set per key) when `REDIS_URL` is set and reachable.
 *   - In-memory timestamps otherwise, which is exact on a single instance and
 *     explicitly not a distributed guarantee.
 *
 * A Redis outage degrades to memory instead of failing the endpoint: losing a
 * shared counter is a smaller problem than taking the tool offline.
 */

export type RateLimitBackend = "memory" | "redis";

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  /** Epoch milliseconds when the oldest hit leaves the window. */
  resetAtMs: number;
  backend: RateLimitBackend;
};

export type RateLimiter = {
  consume(key: string): Promise<RateLimitResult>;
  readonly backend: RateLimitBackend;
};

export class MemorySlidingWindow {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 5_000,
  ) {}

  consume(key: string, now = Date.now()): RateLimitResult {
    const cutoff = now - this.windowMs;
    const timestamps = (this.hits.get(key) ?? []).filter((stamp) => stamp > cutoff);

    if (timestamps.length >= this.limit) {
      this.hits.set(key, timestamps);
      const oldest = timestamps[0] ?? now;
      return {
        ok: false,
        limit: this.limit,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000)),
        resetAtMs: oldest + this.windowMs,
        backend: "memory",
      };
    }

    timestamps.push(now);
    this.hits.set(key, timestamps);
    this.prune(now);

    return {
      ok: true,
      limit: this.limit,
      remaining: Math.max(0, this.limit - timestamps.length),
      retryAfterSeconds: 0,
      resetAtMs: now + this.windowMs,
      backend: "memory",
    };
  }

  private prune(now: number): void {
    if (this.hits.size <= this.maxKeys) return;
    for (const [key, stamps] of this.hits) {
      const last = stamps[stamps.length - 1] ?? 0;
      if (last <= now - this.windowMs) this.hits.delete(key);
    }
  }
}

type RedisPipeline = {
  zremrangebyscore: (key: string, min: number, max: number) => unknown;
  zadd: (key: string, score: number, member: string) => unknown;
  zcard: (key: string) => unknown;
  pexpire: (key: string, ms: number) => unknown;
  exec: () => Promise<[Error | null, unknown][] | null>;
};

type RedisClient = {
  multi: () => RedisPipeline;
  zrem: (key: string, member: string) => Promise<unknown>;
  on: (event: string, listener: (...args: unknown[]) => void) => unknown;
};

/** Lazily loads ioredis so the package is optional at runtime. */
async function loadRedisClient(url: string): Promise<RedisClient> {
  const moduleName = "ioredis";
  const imported = (await import(/* webpackIgnore: true */ moduleName)) as {
    default: new (url: string, options: Record<string, unknown>) => RedisClient;
  };

  const client = new imported.default(url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 1_000,
    lazyConnect: false,
  });

  client.on("error", () => {
    /* Errors are handled by the caller's fallback path. */
  });

  return client;
}

export type RateLimiterOptions = {
  limit: number;
  windowMs: number;
  redisUrl?: string;
};

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const memory = new MemorySlidingWindow(options.limit, options.windowMs);
  const redisUrl = options.redisUrl?.trim();

  let client: RedisClient | null = null;
  let clientPromise: Promise<RedisClient | null> | null = null;
  let active: RateLimitBackend = redisUrl ? "redis" : "memory";

  async function getClient(): Promise<RedisClient | null> {
    if (!redisUrl) return null;
    if (client) return client;
    if (!clientPromise) {
      clientPromise = loadRedisClient(redisUrl)
        .then((loaded) => {
          client = loaded;
          return loaded;
        })
        .catch(() => {
          active = "memory";
          return null;
        });
    }
    return clientPromise;
  }

  async function consumeRedis(key: string): Promise<RateLimitResult | null> {
    const redis = await getClient();
    if (!redis) return null;

    const now = Date.now();
    const cutoff = now - options.windowMs;
    const redisKey = `ratelimit:${key}`;
    const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;

    try {
      const pipeline = redis.multi();
      pipeline.zremrangebyscore(redisKey, 0, cutoff);
      pipeline.zadd(redisKey, now, member);
      pipeline.zcard(redisKey);
      pipeline.pexpire(redisKey, options.windowMs);

      const results = await pipeline.exec();
      if (!results) return null;

      const count = Number(results[2]?.[1] ?? 1);
      if (count > options.limit) {
        await redis.zrem(redisKey, member).catch(() => undefined);
        return {
          ok: false,
          limit: options.limit,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil(options.windowMs / 1000)),
          resetAtMs: now + options.windowMs,
          backend: "redis",
        };
      }

      return {
        ok: true,
        limit: options.limit,
        remaining: Math.max(0, options.limit - count),
        retryAfterSeconds: 0,
        resetAtMs: now + options.windowMs,
        backend: "redis",
      };
    } catch {
      active = "memory";
      return null;
    }
  }

  return {
    get backend() {
      return active;
    },
    async consume(key: string): Promise<RateLimitResult> {
      if (active === "redis") {
        const result = await consumeRedis(key);
        if (result) return result;
      }
      return memory.consume(key);
    },
  };
}

/**
 * Best-effort client identity. Only used for rate limiting, never stored.
 * Ordering matters: the edge proxy header wins over a spoofable client value.
 */
export function clientKeyFromHeaders(headers: Headers, route: string): string {
  const forwarded = headers.get("x-forwarded-for");
  const ip =
    headers.get("cf-connecting-ip")?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    forwarded?.split(",")[0]?.trim() ||
    "unknown";

  return `${route}:${ip}`;
}

export function rateLimitConfigFromEnv(env: Record<string, string | undefined> = process.env): {
  limit: number;
  windowMs: number;
  redisUrl?: string;
} {
  const limit = Number.parseInt(env.RATE_LIMIT_MAX ?? "", 10);
  const windowSeconds = Number.parseInt(env.RATE_LIMIT_WINDOW_SECONDS ?? "", 10);

  return {
    limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
    windowMs: (Number.isFinite(windowSeconds) && windowSeconds > 0 ? windowSeconds : 300) * 1_000,
    redisUrl: env.REDIS_URL?.trim() || undefined,
  };
}
