import { db } from "@/config/db";
import { users } from "@/config/schema";  
import { eq, and, isNull } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";  
import { NextResponse } from "next/server";  

export async function POST() {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress;
    if (!email) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    // Check if user already exists
    const userInfo = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (userInfo.length === 0) {
      // Insert new user with clerkId
      const saveResult = await db.insert(users).values({
        name: user.fullName || "",
        email,
        imageUrl: user.imageUrl || "",
        clerkId: user.id,
      }).returning({
        id: users.id,
        name: users.name,
        email: users.email,
        imageUrl: users.imageUrl,
        credits: users.credits,
        clerkId: users.clerkId,
      });

      return NextResponse.json({ result: saveResult[0] });
    }

    // Backfill clerkId if it isn't set on an existing row
    if (!userInfo[0].clerkId) {
      await db
        .update(users)
        .set({ clerkId: user.id })
        .where(eq(users.email, email));
    }

    // If user already exists, return existing data
    return NextResponse.json({ result: userInfo[0] });

  } catch (error) {
    console.error("Error verifying/saving user:", error);
    return NextResponse.json({ error: "Failed to verify user" }, { status: 500 });
  }
}
