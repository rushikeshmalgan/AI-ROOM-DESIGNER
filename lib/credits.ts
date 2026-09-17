import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { db } from '@/config/db';
import { users } from '@/config/schema';
import { eq } from 'drizzle-orm';

let _redis: Redis | undefined;

function getRedis(): Redis {
  if (!_redis) {
    _redis = Redis.fromEnv();
  }
  return _redis;
}

// 10 requests/minute per user — SDXL/Ideogram generation takes ~10-30s
// each, so this allows reasonable burst usage while preventing abuse.
let _rateLimiter: Ratelimit | undefined;

export function getRateLimiter(): Ratelimit {
  if (!_rateLimiter) {
    _rateLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(10, '1m'),
      prefix: 'ratelimit:',
    });
  }
  return _rateLimiter;
}

const CREDITS_PREFIX = 'credits:';
const DEFAULT_CREDITS = 3;

// Lua script: atomically check-and-decrement. Returns [1, remaining] on
// success, [0, 0] if the balance is already zero (no decrement performed).
const luaDecrement = `
  local current = redis.call('GET', KEYS[1])
  local count = tonumber(current)
  if not count or count <= 0 then
    return {0, 0}
  end
  local remaining = redis.call('DECR', KEYS[1])
  return {1, tonumber(remaining)}
`;

export async function getCredits(userId: string): Promise<number> {
  const redis = getRedis();
  const key = `${CREDITS_PREFIX}${userId}`;
  const stored = await redis.get(key);

  if (stored !== null && stored !== undefined) {
    return Number(stored);
  }

  // Redis miss — seed with Postgres default(3) to avoid silent 0 reset
  await redis.set(key, DEFAULT_CREDITS);
  return DEFAULT_CREDITS;
}

export async function decrementCredit(userId: string): Promise<{ ok: boolean; remaining: number }> {
  const redis = getRedis();
  const key = `${CREDITS_PREFIX}${userId}`;
  const result = await redis.eval(luaDecrement, [key], []) as [number, number];
  return { ok: result[0] === 1, remaining: result[1] };
}

// Atomic refund — call exactly once per failed generation, after a
// successful decrementCredit, when the AI provider itself fails (not
// when generation succeeds but a downstream step like the DB save
// fails — the provider cost was already incurred at that point).
// INCR is atomic in Redis, so concurrent refunds/decrements for the
// same user can't race each other into an inconsistent count.
export async function refundCredit(userId: string): Promise<number> {
  const redis = getRedis();
  const key = `${CREDITS_PREFIX}${userId}`;
  return await redis.incr(key);
}

// Async best-effort write-back to Postgres after a successful generation.
// Postgres `users` is keyed by email (not Clerk ID), so we need the email.
export async function syncCreditsToDb(email: string, credits: number): Promise<void> {
  try {
    await db
      .update(users)
      .set({ credits })
      .where(eq(users.email, email));
  } catch (err) {
    console.error('Failed to sync credits to Postgres (best-effort):', err);
  }
}

export async function checkRateLimit(userId: string): Promise<{ success: boolean; remaining: number; reset: number }> {
  const rl = getRateLimiter();
  const { success, remaining, reset } = await rl.limit(userId);
  return { success, remaining, reset };
}
