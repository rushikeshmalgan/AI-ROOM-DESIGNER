/**
 * Tests for POST /api/upload-image
 *
 * Route shape (from actual handler):
 *   - Reads multipart FormData `file` field
 *   - Converts to base64 data URI
 *   - Calls cloudinary.uploader.upload(dataUri, { folder, resource_type })
 *   - Returns { success: true, imageUrl: secure_url, publicId: public_id }
 *   - No Clerk currentUser() call — auth is middleware-only for this route
 *
 * NOTE ON MOCK STRUCTURE: vi.mock factories are hoisted above variable
 * declarations, so mock spies must be defined inside the factory and
 * exposed via the module object, then retrieved via import.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock declarations ────────────────────────────────────────────────────────

vi.mock('@/config/cloudinaryConfig', () => {
  const mockUpload = vi.fn();
  return {
    cloudinary: { uploader: { upload: mockUpload } },
    // expose spy so tests can access it
    __mockUpload: mockUpload,
  };
});

// ── Imports (after mocks) ────────────────────────────────────────────────────
import * as cloudinaryModule from '@/config/cloudinaryConfig';
import { POST } from '@/app/api/upload-image/route.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(fileEntry) {
  const fakeFormData = {
    get: (key) => (key === 'file' ? fileEntry : null),
  };
  return { formData: async () => fakeFormData };
}

function makeFile(content = 'fake-image-bytes', mimeType = 'image/jpeg') {
  const bytes = Buffer.from(content);
  return {
    type: mimeType,
    arrayBuffer: async () => bytes.buffer,
  };
}

const CLOUDINARY_RESULT = {
  secure_url: 'https://res.cloudinary.com/demo/image/upload/ai-room-design/abc123.jpg',
  public_id: 'ai-room-design/abc123',
};

// ── Tests ────────────────────────────────────────────────────────────────────
describe('POST /api/upload-image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Happy path — JPEG ──────────────────────────────────────────────────────
  it('happy path — JPEG file → 200 with imageUrl and publicId', async () => {
    cloudinaryModule.__mockUpload.mockResolvedValue(CLOUDINARY_RESULT);

    const req = makeRequest(makeFile());
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.imageUrl).toBe(CLOUDINARY_RESULT.secure_url);
    expect(body.publicId).toBe(CLOUDINARY_RESULT.public_id);

    // Confirm Cloudinary was called with correct options
    expect(cloudinaryModule.__mockUpload).toHaveBeenCalledTimes(1);
    const [dataUri, options] = cloudinaryModule.__mockUpload.mock.calls[0];
    expect(dataUri).toMatch(/^data:image\/jpeg;base64,/);
    expect(options.folder).toBe('ai-room-design');
    expect(options.resource_type).toBe('auto');
  });

  // ── Happy path — PNG ───────────────────────────────────────────────────────
  it('happy path — PNG file → data URI uses image/png mime type', async () => {
    cloudinaryModule.__mockUpload.mockResolvedValue(CLOUDINARY_RESULT);

    const req = makeRequest(makeFile('png-bytes', 'image/png'));
    await POST(req);

    const [dataUri] = cloudinaryModule.__mockUpload.mock.calls[0];
    expect(dataUri).toMatch(/^data:image\/png;base64,/);
  });

  // ── 400 — no file field ────────────────────────────────────────────────────
  it('no file in form data → 400 "No file uploaded"', async () => {
    const req = makeRequest(null);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('No file uploaded');
    expect(cloudinaryModule.__mockUpload).not.toHaveBeenCalled();
  });

  // ── 500 — Cloudinary throws ────────────────────────────────────────────────
  it('Cloudinary upload throws → 500 "Failed to upload image"', async () => {
    cloudinaryModule.__mockUpload.mockRejectedValue(new Error('Cloudinary connection error'));

    const req = makeRequest(makeFile());
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to upload image');
  });

  // ── Observation: no currentUser() call in this route ─────────────────────
  it('OBSERVATION: route has no currentUser() call — auth is middleware-only', async () => {
    // The upload-image route does not call currentUser() inside the handler.
    // This means auth for /api/upload-image relies entirely on clerkMiddleware
    // in middleware.js (which runs for all /api routes), not a secondary
    // per-handler check. Documenting this as observed behavior.
    cloudinaryModule.__mockUpload.mockResolvedValue(CLOUDINARY_RESULT);

    const req = makeRequest(makeFile());
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
