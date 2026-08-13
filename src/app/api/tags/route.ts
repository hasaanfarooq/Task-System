import { NextResponse } from "next/server";
import { db } from "@/db";
import { tags } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allTags = await db.select().from(tags);
  return NextResponse.json({ tags: allTags });
}
