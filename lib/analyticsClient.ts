'use client';

// Fire-and-forget client-side event tracking. Never awaited by callers,
// never throws, and never blocks or delays the interaction it's
// attached to — losing an analytics event is fine; a broken button
// because analytics failed is not.
export function track(event: string, properties?: Record<string, unknown>): void {
  try {
    const payload = JSON.stringify({ event, properties });

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      const sent = navigator.sendBeacon('/api/analytics/track', blob);
      if (sent) return;
    }

    if (typeof fetch === 'function') {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // best-effort — never let a tracking failure surface to the user
  }
}
