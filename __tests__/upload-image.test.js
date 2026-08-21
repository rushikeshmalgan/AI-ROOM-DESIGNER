import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock declarations ────────────────────────────────────────────────────────

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}));

vi.mock('@/lib/credits', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('@/config/cloudinaryConfig', () => {
  const mockUpload = vi.fn();
  return {
    cloudinary: { uploader: { upload: mockUpload } },
    __mockUpload: mockUpload,
  };
});

// ── Imports (after mocks) ────────────────────────────────────────────────────
import { currentUser } from '@clerk/nextjs/server';
import { checkRateLimit } from '@/lib/credits';
import * as cloudinaryModule from '@/config/cloudinaryConfig';
import { POST } from '@/app/api/upload-image/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(fileEntry) {
  const fakeFormData = {
    get: (key) => (key === 'file' ? fileEntry : null),
  };
  return { formData: async () => fakeFormData };
}

function makeFile(content = 'fake-image-bytes', mimeType = 'image/jpeg', size = 1024) {
  const bytes = Buffer.from(content);
  return {
    type: mimeType,
    size: size,
    arrayBuffer: async () => bytes.buffer,
  };
}

const AUTHED_USER = {
  id: 'user_clerk_123',
  email: 'test@example.com',
};

const CLOUDINARY_RESULT = {
  secure_url: 'https://res.cloudinary.com/demo/image/upload/ai-room-design/abc123.jpg',
  public_id: 'ai-room-design/abc123',
};

// ── Tests ────────────────────────────────────────────────────────────────────
describe('POST /api/upload-image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true, remaining: 9, reset: Date.now() + 60000 });
  });

  // ── 401 — Unauthenticated ──────────────────────────────────────────────────
  it('unauthenticated request → 401 Unauthorized', async () => {
    vi.mocked(currentUser).mockResolvedValue(null);

    const req = makeRequest(makeFile());
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
    expect(cloudinaryModule.__mockUpload).not.toHaveBeenCalled();
  });

  // ── 429 — Rate limit exceeded ──────────────────────────────────────────────
  it('rate limit exceeded → 429', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ success: false, remaining: 0, reset: Date.now() + 30000 });

    const req = makeRequest(makeFile());
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toMatch(/Rate limit exceeded/i);
    expect(cloudinaryModule.__mockUpload).not.toHaveBeenCalled();
  });

  // ── 400 — No file ──────────────────────────────────────────────────────────
  it('no file in form data → 400 "No file uploaded"', async () => {
    const req = makeRequest(null);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('No file uploaded');
    expect(cloudinaryModule.__mockUpload).not.toHaveBeenCalled();
  });

  // ── 400 — Unsupported MIME Type ────────────────────────────────────────────
  it('unsupported MIME type (e.g. text/plain or application/pdf) → 400', async () => {
    const req = makeRequest(makeFile('some-text', 'text/plain'));
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Unsupported file type/i);
    expect(cloudinaryModule.__mockUpload).not.toHaveBeenCalled();
  });

  // ── 400 — File size exceeds 10MB limit ─────────────────────────────────────
  it('oversized file (> 10MB) → 400 and rejects before upload', async () => {
    const oversizedFile = makeFile('large-bytes', 'image/jpeg', 15 * 1024 * 1024); // 15MB
    const req = makeRequest(oversizedFile);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/File size exceeds the 10MB limit/i);
    expect(cloudinaryModule.__mockUpload).not.toHaveBeenCalled();
  });

  // ── 200 — Happy path JPEG ──────────────────────────────────────────────────
  it('happy path — valid JPEG file → 200 with imageUrl and publicId', async () => {
    cloudinaryModule.__mockUpload.mockResolvedValue(CLOUDINARY_RESULT);

    const req = makeRequest(makeFile('jpeg-content', 'image/jpeg', 2048));
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.imageUrl).toBe(CLOUDINARY_RESULT.secure_url);
    expect(body.publicId).toBe(CLOUDINARY_RESULT.public_id);

    expect(cloudinaryModule.__mockUpload).toHaveBeenCalledTimes(1);
    const [dataUri, options] = cloudinaryModule.__mockUpload.mock.calls[0];
    expect(dataUri).toMatch(/^data:image\/jpeg;base64,/);
    expect(options.folder).toBe('ai-room-design');
    expect(options.resource_type).toBe('image');
  });

  // ── 200 — Happy path PNG ───────────────────────────────────────────────────
  it('happy path — valid PNG file → data URI uses image/png mime type', async () => {
    cloudinaryModule.__mockUpload.mockResolvedValue(CLOUDINARY_RESULT);

    const req = makeRequest(makeFile('png-bytes', 'image/png', 1024));
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    const [dataUri] = cloudinaryModule.__mockUpload.mock.calls[0];
    expect(dataUri).toMatch(/^data:image\/png;base64,/);
  });

  // ── 500 — Cloudinary throws ────────────────────────────────────────────────
  it('Cloudinary upload throws → 500 "Failed to upload image"', async () => {
    cloudinaryModule.__mockUpload.mockRejectedValue(new Error('Cloudinary network timeout'));

    const req = makeRequest(makeFile());
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to upload image');
  });
});
