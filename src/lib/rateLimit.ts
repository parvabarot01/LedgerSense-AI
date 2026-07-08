import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Ingestion and detection endpoints are the expensive/abusable ones (large
// CSV rows, statistical passes, LLM calls), so they're the two rate-limited
// surfaces called out in the security playbook. Degrades to an always-allow
// no-op when Upstash env vars aren't set yet, so local dev works before the
// user connects a real Redis instance.

const redisConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis = redisConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

function makeLimiter(prefix: string, limit: number, windowSeconds: number) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    prefix: `ledgersense:${prefix}`,
  });
}

const ingestionLimiter = makeLimiter("ingest", 20, 60);
const detectionLimiter = makeLimiter("detect", 10, 60);
const aiLimiter = makeLimiter("ai", 30, 60);

export type RateLimitResult = { success: boolean; remaining: number; limit: number };

async function check(limiter: Ratelimit | null, identifier: string): Promise<RateLimitResult> {
  if (!limiter) {
    // Not configured: allow, but make the gap visible rather than silent.
    return { success: true, remaining: 1, limit: 1 };
  }
  const result = await limiter.limit(identifier);
  return { success: result.success, remaining: result.remaining, limit: result.limit };
}

export const rateLimit = {
  ingestion: (identifier: string) => check(ingestionLimiter, identifier),
  detection: (identifier: string) => check(detectionLimiter, identifier),
  ai: (identifier: string) => check(aiLimiter, identifier),
  isConfigured: redisConfigured,
};
