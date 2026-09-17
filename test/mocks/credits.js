// E2E test-mode mock for @/lib/credits — never touches Upstash Redis.
// Generous, always-succeeding limits so E2E specs exercise the actual
// generate/refine flows rather than credit/rate-limit edge cases (those
// are already covered by the Vitest route tests with precise control
// over ok/remaining values).
export async function checkRateLimit() {
  return { success: true, remaining: 99, reset: Date.now() + 60000 };
}

export async function decrementCredit() {
  return { ok: true, remaining: 2 };
}

export async function refundCredit() {
  return 3;
}

export async function syncCreditsToDb() {}

export async function getCredits() {
  return 3;
}

export async function recordCreditTransaction() {}
