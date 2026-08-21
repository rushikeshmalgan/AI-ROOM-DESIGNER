import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/config/db';
import { designs } from '@/config/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(): Promise<NextResponse> {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDesigns = await db
      .select()
      .from(designs)
      .where(eq(designs.userId, user.id))
      .orderBy(desc(designs.createdAt));

    return NextResponse.json({
      success: true,
      designs: userDesigns,
    });

  } catch (error) {
    console.error('Error fetching designs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch designs' },
      { status: 500 }
    );
  }
}
