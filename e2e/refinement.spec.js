import { test, expect } from '@playwright/test';

// Exercises: refinement request and version-chain rendering. Seeds an
// initial design directly via the API (faster/more robust than driving
// the whole upload UI again) against the same in-memory mocks.
test.describe('Refine a design', () => {
  test('refining a design adds a new version to its chain', async ({ page, request }) => {
    const seedRes = await request.post('/api/generate-design', {
      data: {
        imageUrl: 'https://e2e-fake-cdn.test/seed-room.jpg',
        roomType: 'Bedroom',
        designType: 'Scandinavian',
      },
    });
    expect(seedRes.ok()).toBeTruthy();
    const { design } = await seedRes.json();

    await page.goto('/dashboard');
    const card = page.getByTestId(`design-chain-${design.id}`);
    await expect(card).toBeVisible();

    await card.getByPlaceholder(/change the sofa to a beige sectional/i).fill('Change the sofa to a beige sectional');
    await card.getByRole('button', { name: /refine design/i }).click();

    // Version chain: badge appears once there's more than one version,
    // and the instruction that produced the new version is shown.
    await expect(card.getByText('2 versions')).toBeVisible();
    await expect(card.getByText(/change the sofa to a beige sectional/i)).toBeVisible();

    // Refine button returns to its resting label, not stuck on
    // "Refining..." — it's correctly disabled again here only because a
    // successful refine clears the instruction input, not because it's
    // stuck. Typing new text should re-enable it.
    const refineButton = card.getByRole('button', { name: /^refine design$/i });
    await expect(refineButton).toBeVisible();
    await card.getByPlaceholder(/change the sofa to a beige sectional/i).fill('Make the walls warmer');
    await expect(refineButton).toBeEnabled();
  });

  test('a suggested-refinement chip fills the instruction input', async ({ page, request }) => {
    const seedRes = await request.post('/api/generate-design', {
      data: {
        imageUrl: 'https://e2e-fake-cdn.test/seed-room-2.jpg',
        roomType: 'Kitchen',
        designType: 'Industrial',
      },
    });
    expect(seedRes.ok()).toBeTruthy();
    const { design } = await seedRes.json();

    await page.goto('/dashboard');
    const card = page.getByTestId(`design-chain-${design.id}`);
    await card.getByRole('button', { name: 'Add a rug' }).click();

    await expect(card.getByPlaceholder(/change the sofa to a beige sectional/i)).toHaveValue('Add a rug');
  });
});
