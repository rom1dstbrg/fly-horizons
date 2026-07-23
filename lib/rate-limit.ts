import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const isConfigured =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

let _redis: Redis | null = null;
function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
}

// Cache des limiteurs par (limit, window) pour éviter de recréer à chaque requête
const _limiters = new Map<string, Ratelimit>();
function getLimiter(limit: number, windowMs: number): Ratelimit {
  const key = `${limit}:${windowMs}`;
  if (!_limiters.has(key)) {
    _limiters.set(key, new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(limit, `${Math.round(windowMs / 1000)} s`),
      analytics: false,
    }));
  }
  return _limiters.get(key)!;
}

/**
 * Rate limiter distribué via Upstash Redis (compatible serverless).
 * Requiert UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN dans l'env.
 * Sans ces variables (dev local), laisse toutes les requêtes passer.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number }> {
  if (!isConfigured) return { allowed: true, remaining: limit };
  try {
    const { success, remaining } = await getLimiter(limit, windowMs).limit(key);
    return { allowed: success, remaining: remaining ?? 0 };
  } catch {
    return { allowed: true, remaining: limit };
  }
}

/** Extrait l'IP cliente depuis les headers Next.js. */
export function getIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
