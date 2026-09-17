// E2E test-mode mock for @clerk/nextjs (client-side). See
// clerk-nextjs-server.js for why this exists and when it's active.

export const TEST_USER = {
  id: 'user_e2e_test',
  fullName: 'E2E Tester',
  primaryEmailAddress: { emailAddress: 'e2e@test.local' },
  imageUrl: '',
};

export function ClerkProvider({ children }) {
  return <>{children}</>;
}

export function useUser() {
  return { isLoaded: true, isSignedIn: true, user: TEST_USER };
}

export function UserButton() {
  return <div data-testid="mock-user-button">E2E Tester</div>;
}

export function SignIn() {
  return <div data-testid="mock-sign-in">Mock Sign In (E2E test mode)</div>;
}

export function SignUp() {
  return <div data-testid="mock-sign-up">Mock Sign Up (E2E test mode)</div>;
}
