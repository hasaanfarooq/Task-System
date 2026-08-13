import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const duration = typeof body.duration === "number" && body.duration > 0 && body.duration <= 60
      ? body.duration
      : 15;

    const now = new Date();

    const [updatedUser] = await db
      .update(users)
      .set({
        active_screen_time_seconds: sql`${users.active_screen_time_seconds} + ${duration}`,
        last_active_at: now,
      })
      .where(eq(users.id, session.id))
      .returning({
        id: users.id,
        active_screen_time_seconds: users.active_screen_time_seconds,
        last_active_at: users.last_active_at,
      });

    return NextResponse.json({
      success: true,
      active_screen_time_seconds: updatedUser?.active_screen_time_seconds || 0,
      last_active_at: updatedUser?.last_active_at || now,
    });
  } catch (error: any) {
    console.error("Heartbeat update error:", error);
    return NextResponse.json({ error: "Failed to record screen time" }, { status: 500 });
  }
}
