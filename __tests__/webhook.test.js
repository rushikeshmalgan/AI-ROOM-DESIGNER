import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock svix Webhook.verify
vi.mock('svix', () => ({
  Webhook: vi.fn().mockImplementation((secret) => ({
    verify: vi.fn((payload) => {
      if (secret === 'bad-secret') {
        throw new Error('Invalid signature');
      }
      return JSON.parse(payload);
    }),
  })),
}));

vi.mock('@/lib/userUpsert', () => ({
  upsertUserFromClerk: vi.fn(),
}));

import { upsertUserFromClerk } from '@/lib/userUpsert';
import { POST } from '@/app/api/webhooks/clerk/route';

function makeWebhookRequest(payload, headers) {
  return {
    text: async () => JSON.stringify(payload),
    headers: {
      get: (name) => headers[name] || null,
    },
  };
}

const VALID_HEADERS = {
  'svix-id': 'test-id',
  'svix-timestamp': '1234567890',
  'svix-signature': 'test-sig',
};

const USER_CREATED_PAYLOAD = {
  type: 'user.created',
  data: {
    id: 'user_clerk_new',
    full_name: 'Test User',
    image_url: 'https://example.com/avatar.jpg',
    primary_email_address_id: 'email_1',
    email_addresses: [{ id: 'email_1', email_address: 'test@example.com' }],
  },
};

describe('POST /api/webhooks/clerk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLERK_WEBHOOK_SECRET = 'test-secret';
  });

  it('user.created with valid signature → provisions user and returns 200', async () => {
    vi.mocked(upsertUserFromClerk).mockResolvedValue({ id: 1, clerkId: 'user_clerk_new' });

    const req = makeWebhookRequest(USER_CREATED_PAYLOAD, VALID_HEADERS);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(upsertUserFromClerk).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user_clerk_new' })
    );
  });

  it('missing svix headers → 401', async () => {
    const req = makeWebhookRequest(USER_CREATED_PAYLOAD, {});
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Missing svix headers');
    expect(upsertUserFromClerk).not.toHaveBeenCalled();
  });

  it('invalid signature → 401', async () => {
    process.env.CLERK_WEBHOOK_SECRET = 'bad-secret';
    const req = makeWebhookRequest(USER_CREATED_PAYLOAD, VALID_HEADERS);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Invalid signature');
    expect(upsertUserFromClerk).not.toHaveBeenCalled();
  });

  it('non-user.created event type → returns 200 without provisioning', async () => {
    const req = makeWebhookRequest({ type: 'user.updated', data: {} }, VALID_HEADERS);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(upsertUserFromClerk).not.toHaveBeenCalled();
  });

  it('CLERK_WEBHOOK_SECRET not set → 500', async () => {
    delete process.env.CLERK_WEBHOOK_SECRET;
    const req = makeWebhookRequest(USER_CREATED_PAYLOAD, VALID_HEADERS);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Webhook secret not configured');
  });
});
