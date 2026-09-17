// E2E test-mode mock for @clerk/nextjs/server.
//
// Only ever bundled when PLAYWRIGHT_TEST_MODE=1 (see next.config.mjs) —
// this alias is applied by a webpack config branch that is unreachable
// unless that exact env var is set, and it is never set in a production
// build or `npm run build`/`npm start`. This file replaces real Clerk
// auth entirely for E2E runs so tests never touch a real Clerk backend;
// see PHASE 4 in docs/manual-qa-checklist.md-adjacent E2E notes (e2e/README.md)
// for why this exists instead of hitting a real Clerk test instance.

export const TEST_USER = {
  id: 'user_e2e_test',
  primaryEmailAddress: { emailAddress: 'e2e@test.local' },
  emailAddresses: [{ emailAddress: 'e2e@test.local' }],
  fullName: 'E2E Tester',
  imageUrl: '',
};

export function clerkMiddleware() {
  // Real clerkMiddleware wraps a (auth, req) handler and returns the
  // actual Next.js middleware function. In test mode nothing needs
  // protecting, so skip straight past it — returning undefined from
  // Next.js middleware is equivalent to NextResponse.next().
  return function testModeMiddleware() {
    return undefined;
  };
}

export function createRouteMatcher() {
  return () => false;
}

export async function currentUser() {
  return TEST_USER;
}
