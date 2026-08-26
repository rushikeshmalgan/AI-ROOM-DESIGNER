import { db } from '@/config/db';
import { users } from '@/config/schema';
import { eq } from 'drizzle-orm';

export interface ClerkUserData {
  id: string;
  fullName?: string | null;
  primaryEmailAddress?: { emailAddress: string } | null;
  emailAddresses?: Array<{ emailAddress: string }>;
  imageUrl?: string;
}

/**
 * Upsert a user row from Clerk identity data. Shared by the verify-user
 * route (client-triggered fallback) and the Clerk webhook handler (primary
 * provisioning path) so both call the same logic.
 *
 * Returns the user row (inserted or existing), or null if the user has no
 * email (cannot provision without an email to key on).
 */
export async function upsertUserFromClerk(clerkUser: ClerkUserData) {
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ||
    clerkUser.emailAddresses?.[0]?.emailAddress;

  if (!email) {
    return null;
  }

  // Check if user already exists by email
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (existing.length > 0) {
    // Backfill clerkId if it isn't set
    if (!existing[0].clerkId) {
      await db
        .update(users)
        .set({ clerkId: clerkUser.id })
        .where(eq(users.email, email));
    }
    return existing[0];
  }

  // Insert new user
  const inserted = await db
    .insert(users)
    .values({
      name: clerkUser.fullName || '',
      email,
      imageUrl: clerkUser.imageUrl || '',
      clerkId: clerkUser.id,
    })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      imageUrl: users.imageUrl,
      credits: users.credits,
      clerkId: users.clerkId,
    });

  return inserted[0];
}
