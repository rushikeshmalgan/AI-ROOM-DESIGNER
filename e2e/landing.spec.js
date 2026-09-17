import { test, expect } from '@playwright/test';

// Public page — no Clerk/DB mocking needed, real value: catches a
// broken landing page (exactly the class of regression a build alone
// won't catch if the page renders but looks wrong or a link 404s).
test.describe('Landing page', () => {
  test('loads and links to the dashboard', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const getStarted = page.getByRole('link', { name: /get started/i });
    await expect(getStarted).toBeVisible();
    await expect(getStarted).toHaveAttribute('href', '/dashboard');
  });
});
