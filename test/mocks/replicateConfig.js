// E2E test-mode mock for @/config/replicateConfig — never calls the
// real Replicate API. Returns a distinct, deterministic-looking URL per
// call so tests can assert two generations produced different images.
let counter = 0;

export async function generateRoomDesign() {
  counter += 1;
  return [`https://e2e-fake-cdn.test/generated/${counter}.jpg`];
}

export async function refineRoomDesign() {
  counter += 1;
  return [`https://e2e-fake-cdn.test/refined/${counter}.jpg`];
}
