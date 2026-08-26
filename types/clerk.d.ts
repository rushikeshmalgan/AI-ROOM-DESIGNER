declare module '@clerk/nextjs/server' {
  export interface ClerkUser {
    id: string;
    fullName?: string | null;
    imageUrl?: string;
    primaryEmailAddress: {
      emailAddress: string;
    } | null;
    emailAddresses?: Array<{ emailAddress: string }>;
  }

  export function currentUser(): Promise<ClerkUser | null>;
}
