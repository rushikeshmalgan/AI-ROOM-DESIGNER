import { db } from "@/config/db";
import { users } from "@/config/schema";  
import { eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";  
import { NextResponse } from "next/server";  

export async function POST() {
  try {
    const user = await currentUser();

    if (!user?.primaryEmailAddress?.emailAddress) {
      return new Response("User email not found", { status: 400 });
    }

    // Check if user already exists
    const userInfo = await db
      .select()
      .from(users)
      .where(eq(users.email, user.primaryEmailAddress.emailAddress));

    console.log("User Info:", userInfo);

    if (userInfo.length === 0) {
      // Insert new user
      const SaveResult = await db.insert(users).values({
        name: user.fullName || "",
        email: user.primaryEmailAddress.emailAddress,
        imageUrl: user.imageUrl,
      }).returning({
        id: users.id,
        name: users.name,
        email: users.email,
        imageUrl: users.imageUrl,
      });

      console.log("Inserted User:", SaveResult);

      return NextResponse.json({ result: SaveResult[0] });
    }

    // If user already exists, return existing data
    return NextResponse.json({ result: userInfo[0] });

  } catch (e) {
    console.error("Error saving user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
