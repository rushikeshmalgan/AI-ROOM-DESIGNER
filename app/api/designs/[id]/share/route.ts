import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/config/db';
import { designs } from '@/config/schema';
import { eq } from 'drizzle-orm';

// Marks a design public (idempotent) so /share/:id can render it without
// auth. Only the owner can do this — same 404-not-403 ownership pattern
// as refine, so a request can't be used to probe other users' design IDs.
// There is currently no way to revoke sharing once granted (make it
// private again) — see README's known limitations.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const designId = Number(id);
    if (!Number.isInteger(designId) || designId <= 0) {
      return NextResponse.json({ error: 'Invalid design ID' }, { status: 400 });
    }

    const rows = await db.select().from(designs).where(eq(designs.id, designId));
    const design = rows[0];
    if (!design || design.userId !== user.id) {
      return NextResponse.json({ error: 'Design not found' }, { status: 404 });
    }

    if (!design.isPublic) {
      await db.update(designs).set({ isPublic: true }).where(eq(designs.id, designId));
    }

    return NextResponse.json({ success: true, shareUrl: `/share/${designId}` });
  } catch (error) {
    console.error('Error sharing design:', error);
    return NextResponse.json({ error: 'Failed to share design' }, { status: 500 });
  }
}
