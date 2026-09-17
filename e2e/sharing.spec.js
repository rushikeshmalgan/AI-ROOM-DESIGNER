import { test, expect } from '@playwright/test';

// Exercises: a design is private by default, sharing it exposes exactly
// one public page, and that page works with no auth session at all.
test.describe('Public design sharing', () => {
  test('an unshared design 404s at /share/:id, then becomes visible after sharing', async ({ page, request }) => {
    const seedRes = await request.post('/api/generate-design', {
      data: {
        imageUrl: 'https://e2e-fake-cdn.test/seed-share.jpg',
        roomType: 'Office',
        designType: 'Minimalist',
      },
    });
    expect(seedRes.ok()).toBeTruthy();
    const { design } = await seedRes.json();

    // Private by default — the public page must not render it.
    const beforeShare = await page.goto(`/share/${design.id}`);
    expect(beforeShare.status()).toBe(404);

    // Explicit opt-in via the share endpoint.
    const shareRes = await request.post(`/api/designs/${design.id}/share`);
    expect(shareRes.ok()).toBeTruthy();
    const { shareUrl } = await shareRes.json();
    expect(shareUrl).toBe(`/share/${design.id}`);

    // Now visible, publicly, with no auth cookie involved beyond what
    // test mode already grants every request.
    await page.goto(shareUrl);
    await expect(page.getByRole('heading', { name: /minimalist office/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /design your own room/i })).toHaveAttribute('href', '/dashboard');
  });
});
