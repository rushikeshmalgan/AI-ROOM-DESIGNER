import { db } from '@/config/db';
import { users } from '@/config/schema';
import { eq, and, gt, sql } from 'drizzle-orm';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// In-memory sliding window rate limiter fallback when Redis is not configured
interface RateLimitRecord {
  timestamps: number[];
}
const inMemoryRateLimits = new Map<string, RateLimitRecord>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10;

let _redis: Redis | null = null;
let _rateLimiter: Ratelimit | null = null;

function getUpstashRateLimiter(): Ratelimit | null {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (!_redis) {
      _redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    }
    if (!_rateLimiter) {
      _rateLimiter = new Ratelimit({
        redis: _redis,
        limiter: Ratelimit.slidingWindow(MAX_REQUESTS, '1m'),
        prefix: 'ratelimit:ai-room:',
      });
    }
    return _rateLimiter;
  }
  return null;
}

/**
 * Check rate limit for a user (10 requests/minute).
 * Uses Upstash Redis if configured, otherwise falls back to in-memory sliding window.
 */
export async function checkRateLimit(userId: string): Promise<{ success: boolean; remaining: number; reset: number }> {
  const upstash = getUpstashRateLimiter();
  if (upstash) {
    try {
      const result = await upstash.limit(userId);
      return { success: result.success, remaining: result.remaining, reset: result.reset };
    } catch (err) {
      console.warn('Upstash rate limiter error, falling back to in-memory:', err);
    }
  }

  // In-memory fallback
  const now = Date.now();
  const userRecord = inMemoryRateLimits.get(userId) || { timestamps: [] };
  
  // Filter timestamps within the window
  const validTimestamps = userRecord.timestamps.filter(ts => now - ts < WINDOW_MS);
  
  if (validTimestamps.length >= MAX_REQUESTS) {
    const oldest = validTimestamps[0];
    const reset = oldest + WINDOW_MS;
    return { success: false, remaining: 0, reset };
  }

  validTimestamps.push(now);
  inMemoryRateLimits.set(userId, { timestamps: validTimestamps });

  return {
    success: true,
    remaining: MAX_REQUESTS - validTimestamps.length,
    reset: now + WINDOW_MS,
  };
}

export interface DeductCreditResult {
  success: boolean;
  creditsRemaining?: number;
  error?: 'INSUFFICIENT_CREDITS' | 'USER_NOT_FOUND' | 'DB_ERROR';
}

/**
 * Atomically deducts 1 credit from the user in the PostgreSQL database.
 * Prevents race conditions by using conditional SQL update:
 * UPDATE users SET credits = credits - 1 WHERE email = ? AND credits > 0
 */
export async function deductCredit(email: string, userName?: string, imageUrl?: string): Promise<DeductCreditResult> {
  if (!email) {
    return { success: false, error: 'USER_NOT_FOUND' };
  }

  try {
    // 1. Attempt atomic deduction
    const updated = await db
      .update(users)
      .set({ credits: sql`${users.credits} - 1` })
      .where(and(eq(users.email, email), gt(users.credits, 0)))
      .returning({ id: users.id, credits: users.credits });

    if (updated && updated.length > 0) {
      return {
        success: true,
        creditsRemaining: updated[0].credits ?? 0,
      };
    }

    // 2. If 0 rows updated, check if user exists or has 0 credits
    const existing = await db
      .select({ id: users.id, credits: users.credits })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length === 0) {
      // User doesn't exist yet in the DB. Create user with default(3) credits and deduct 1 -> 2
      const newUser = await db
        .insert(users)
        .values({
          name: userName || '',
          email,
          imageUrl: imageUrl || '',
          credits: 2, // 3 - 1 credit for current generation
        })
        .returning({ id: users.id, credits: users.credits });

      return {
        success: true,
        creditsRemaining: newUser[0]?.credits ?? 2,
      };
    }

    // User exists but has 0 credits (or credits <= 0)
    return {
      success: false,
      error: 'INSUFFICIENT_CREDITS',
      creditsRemaining: existing[0]?.credits ?? 0,
    };
  } catch (error) {
    console.error('Error during credit deduction:', error);
    return { success: false, error: 'DB_ERROR' };
  }
}

/**
 * Safe refund mechanism if AI generation fails downstream after credit was deducted.
 */
export async function refundCredit(email: string): Promise<void> {
  if (!email) return;

  try {
    await db
      .update(users)
      .set({ credits: sql`${users.credits} + 1` })
      .where(eq(users.email, email));
  } catch (error) {
    console.error('Failed to refund credit to user:', email, error);
  }
}

/**
 * Fetch current user credit balance from database.
 */
export async function getUserCredits(email: string): Promise<number> {
  if (!email) return 0;

  try {
    const userList = await db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return userList[0]?.credits ?? 0;
  } catch (error) {
    console.error('Error fetching user credits:', error);
    return 0;
  }
}
