import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession, hashPassword, isValidRole, isValidUUID } from "@/lib/auth";
import { eq, not } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Employees can only see admins and managers (their contacts) — not other employees
  if (session.role === "employee") {
    const contactUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        created_at: users.created_at,
      })
      .from(users)
      .where(not(eq(users.role, "employee")));

    return NextResponse.json({ users: contactUsers });
  }

  // Admins see screen time analytics + live presence
  if (session.role === "admin") {
    const adminUserList = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        active_screen_time_seconds: users.active_screen_time_seconds,
        last_active_at: users.last_active_at,
        created_at: users.created_at,
      })
      .from(users);

    return NextResponse.json({ users: adminUserList });
  }

  // Managers see all users (without screen time)
  const userList = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      created_at: users.created_at,
    })
    .from(users);

  return NextResponse.json({ users: userList });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin-only creation check
  if (session.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden: Only admins can invite/create new users." },
      { status: 403 }
    );
  }

  try {
    const { name, email, password, role } = await request.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Name, email, password, and role are required." },
        { status: 400 }
      );
    }

    // Validate name length
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json({ error: "Name must be 2-100 characters." }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }

    // Validate password strength
    if (typeof password !== "string" || password.length < 6 || password.length > 128) {
      return NextResponse.json({ error: "Password must be 6-128 characters." }, { status: 400 });
    }

    // Validate role enum
    if (!isValidRole(role)) {
      return NextResponse.json({ error: "Invalid role. Must be admin, manager, or employee." }, { status: 400 });
    }

    // Check email uniqueness
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()));

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "User with this email already exists." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        role: role as "admin" | "manager" | "employee",
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        created_at: users.created_at,
      });

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error: any) {
    console.error("User creation error:", error);
    return NextResponse.json(
      { error: "Failed to create user." },
      { status: 500 }
    );
  }
}
