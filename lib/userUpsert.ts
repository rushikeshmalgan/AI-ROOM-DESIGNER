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
 * Uses an atomic INSERT ... ON CONFLICT DO NOTHING so concurrent callers
 * (webhook + client) don't race: the winner gets the row from .returning(),
 * the loser falls through to a SELECT and gets the same row. No exception
 * is thrown on either path.
 *
 * Returns the user row, or null if the user has no email (cannot provision
 * without an email to key on).
 */
export async function upsertUserFromClerk(clerkUser: ClerkUserData) {
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ||
    clerkUser.emailAddresses?.[0]?.emailAddress;

  if (!email) {
    return null;
  }

  const inserted = await db
    .insert(users)
    .values({
      name: clerkUser.fullName || '',
      email,
      imageUrl: clerkUser.imageUrl || '',
      clerkId: clerkUser.id,
    })
    .onConflictDoNothing({ target: users.email })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      imageUrl: users.imageUrl,
      credits: users.credits,
      clerkId: users.clerkId,
    });

  if (inserted.length > 0) {
    return inserted[0];
  }

  // Someone else won the race and inserted first — fetch what they created.
  const existing = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      imageUrl: users.imageUrl,
      credits: users.credits,
      clerkId: users.clerkId,
    })
    .from(users)
    .where(eq(users.email, email));

  return existing[0] ?? null;
}
