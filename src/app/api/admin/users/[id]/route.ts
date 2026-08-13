import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession, isValidRole, isValidUUID, hashPassword } from "@/lib/auth";
import { eq, and, not } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const { id: targetUserId } = await params;

  if (!isValidUUID(targetUserId)) {
    return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 });
  }

  try {
    const { name, email, role, new_password } = await request.json();
    const updateData: Record<string, any> = {};

    // Validate and apply name
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
        return NextResponse.json({ error: "Name must be 2-100 characters" }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    // Validate and apply email with uniqueness check
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const cleanEmail = email.trim().toLowerCase();
      if (!emailRegex.test(cleanEmail)) {
        return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
      }

      // Check for duplicate email (excluding this user)
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, cleanEmail), not(eq(users.id, targetUserId))));

      if (existing) {
        return NextResponse.json({ error: "Another user with this email already exists" }, { status: 400 });
      }

      updateData.email = cleanEmail;
    }

    // Validate and apply role
    if (role !== undefined) {
      if (!isValidRole(role)) {
        return NextResponse.json({ error: "Invalid role. Must be admin, manager, or employee." }, { status: 400 });
      }
      updateData.role = role;
    }

    // Admin can reset a user's password
    if (new_password !== undefined) {
      if (typeof new_password !== "string" || new_password.length < 6 || new_password.length > 128) {
        return NextResponse.json({ error: "Password must be 6-128 characters" }, { status: 400 });
      }
      updateData.password_hash = await hashPassword(new_password);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, targetUserId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    console.error("Admin user update error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
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

  const { id: targetUserId } = await params;

  if (!isValidUUID(targetUserId)) {
    return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 });
  }

  if (targetUserId === session.id) {
    return NextResponse.json(
      { error: "Cannot delete your own active admin account" },
      { status: 400 }
    );
  }

  // Verify user exists before deleting
  const [targetUser] = await db.select({ id: users.id }).from(users).where(eq(users.id, targetUserId));
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    await db.delete(users).where(eq(users.id, targetUserId));
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error: any) {
    console.error("Admin user delete error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
