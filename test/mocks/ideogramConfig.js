// E2E test-mode mock for @/config/ideogramConfig — never calls Replicate.
let counter = 0;

export async function generateIdeogramImage() {
  counter += 1;
  return `https://e2e-fake-cdn.test/ideogram/${counter}.png`;
}
