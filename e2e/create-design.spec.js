import path from 'path';
import { test, expect } from '@playwright/test';

const FIXTURE_IMAGE = path.join(process.cwd(), 'e2e', 'fixtures', 'room.jpg');

// Exercises: create-new page loads, upload interaction, form state
// updates, and the generation request/result — against the in-memory
// mocks in test/mocks/*.js (no real Replicate/Cloudinary/DB/Clerk).
test.describe('Create a design', () => {
  test('upload, select options, and generate a design', async ({ page }) => {
    await page.goto('/dashboard/create-new');
    await expect(page.getByRole('heading', { name: /redesign your room/i })).toBeVisible();

    // Upload interaction
    await page.locator('#upload-image').setInputFiles(FIXTURE_IMAGE);
    await expect(page.getByAltText('Room preview')).toBeVisible();

    // Form state: room type (Radix combobox) and design style (clickable tile)
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Living Room' }).click();
    await page.getByRole('button', { name: 'Modern' }).click();

    // Generation request
    await page.getByRole('button', { name: /generate design/i }).click();

    // Result: redirected to the dashboard with the new design visible
    await page.waitForURL('**/dashboard');
    await expect(page.getByRole('heading', { name: /your designs/i })).toBeVisible();
    await expect(page.getByText(/living room.*modern style/i)).toBeVisible();
  });

  test('shows a validation error without submitting when nothing is filled in', async ({ page }) => {
    await page.goto('/dashboard/create-new');
    await page.getByRole('button', { name: /generate design/i }).click();
    await expect(page.getByText(/please select an image/i)).toBeVisible();
  });
});
