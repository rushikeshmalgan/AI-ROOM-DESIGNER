import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

import { currentUser } from '@clerk/nextjs/server';
import { trackEvent } from '@/lib/analytics';
import { POST } from '@/app/api/analytics/track/route';

function makeRequest(body) {
  return { json: async () => body };
}

describe('POST /api/analytics/track', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records a whitelisted event with the current user id', async () => {
    vi.mocked(currentUser).mockResolvedValue({ id: 'user_1' });

    const res = await POST(makeRequest({ event: 'landing_view' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(trackEvent).toHaveBeenCalledWith({ event: 'landing_view', userId: 'user_1', properties: undefined });
  });

  it('records anonymously when there is no signed-in user (e.g. landing_view before signup)', async () => {
    vi.mocked(currentUser).mockResolvedValue(null);

    const res = await POST(makeRequest({ event: 'landing_view' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(trackEvent).toHaveBeenCalledWith({ event: 'landing_view', userId: null, properties: undefined });
  });

  it('accepts whitelisted events with properties', async () => {
    vi.mocked(currentUser).mockResolvedValue({ id: 'user_1' });

    const res = await POST(makeRequest({ event: 'design_shared', properties: { designId: 42, method: 'copy_link' } }));

    expect(res.status).toBe(200);
    expect(trackEvent).toHaveBeenCalledWith({
      event: 'design_shared',
      userId: 'user_1',
      properties: { designId: 42, method: 'copy_link' },
    });
  });

  it('silently rejects an event that is not client-trackable (e.g. a server-only lifecycle event)', async () => {
    vi.mocked(currentUser).mockResolvedValue({ id: 'user_1' });

    const res = await POST(makeRequest({ event: 'generation_started' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(false);
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('silently rejects an unknown event name', async () => {
    vi.mocked(currentUser).mockResolvedValue({ id: 'user_1' });

    const res = await POST(makeRequest({ event: 'not_a_real_event' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(false);
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('silently rejects non-object properties', async () => {
    vi.mocked(currentUser).mockResolvedValue({ id: 'user_1' });

    const res = await POST(makeRequest({ event: 'landing_view', properties: 'not an object' }));
    const body = await res.json();

    expect(body.success).toBe(false);
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('silently rejects oversized properties payloads', async () => {
    vi.mocked(currentUser).mockResolvedValue({ id: 'user_1' });
    const bigProperties = { blob: 'x'.repeat(3000) };

    const res = await POST(makeRequest({ event: 'landing_view', properties: bigProperties }));
    const body = await res.json();

    expect(body.success).toBe(false);
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('never throws even if trackEvent itself rejects', async () => {
    vi.mocked(currentUser).mockResolvedValue({ id: 'user_1' });
    vi.mocked(trackEvent).mockRejectedValue(new Error('boom'));

    const res = await POST(makeRequest({ event: 'landing_view' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(false);
  });
});
