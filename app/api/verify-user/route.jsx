import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { upsertUserFromClerk } from "@/lib/userUpsert";

export async function POST() {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await upsertUserFromClerk(user);

    if (!result) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    return NextResponse.json({ result });

  } catch (error) {
    console.error("Error verifying/saving user:", error);
    return NextResponse.json({ error: "Failed to verify user" }, { status: 500 });
  }
}
