import { NextResponse } from "next/server";
import { db } from "@/db";
import { tags } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const { id: tagId } = await params;

  try {
    const { name, color } = await request.json();
    const updateData: Record<string, any> = {};

    if (name) updateData.name = name.trim();
    if (color) updateData.color = color;

    const [updatedTag] = await db
      .update(tags)
      .set(updateData)
      .where(eq(tags.id, tagId))
      .returning();

    return NextResponse.json({ tag: updatedTag });
  } catch (error: any) {
    console.error("Admin tag update error:", error);
    return NextResponse.json({ error: "Failed to update tag" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const { id: tagId } = await params;

  try {
    await db.delete(tags).where(eq(tags.id, tagId));
    return NextResponse.json({ message: "Tag deleted successfully" });
  } catch (error: any) {
    console.error("Admin tag delete error:", error);
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
  }
}
