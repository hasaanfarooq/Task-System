import { NextResponse } from "next/server";
import { db } from "@/db";
import { tags } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const { name, color } = await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
    }

    if (name.trim().length > 50) {
      return NextResponse.json({ error: "Tag name must be 50 characters or less" }, { status: 400 });
    }

    // Validate color is a valid hex
    const colorValue = color || "#2563eb";
    if (!/^#[0-9a-fA-F]{6}$/.test(colorValue)) {
      return NextResponse.json({ error: "Invalid hex color format" }, { status: 400 });
    }

    const [newTag] = await db
      .insert(tags)
      .values({
        name: name.trim(),
        color: colorValue,
      })
      .returning();

    return NextResponse.json({ tag: newTag }, { status: 201 });
  } catch (error: any) {
    console.error("Admin tag creation error:", error);
    return NextResponse.json({ error: "Failed to create tag" }, { status: 500 });
  }
}
