import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, task_assignees } from "@/db/schema";
import { getSession, isValidUUID } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: taskId } = await params;

  if (!isValidUUID(taskId)) {
    return NextResponse.json({ error: "Invalid task ID format" }, { status: 400 });
  }

  // Verify access
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (session.role === "employee" && task.created_by !== session.id) {
    const [assignment] = await db
      .select()
      .from(task_assignees)
      .where(and(eq(task_assignees.task_id, taskId), eq(task_assignees.user_id, session.id)));

    if (!assignment) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  }

  try {
    const { hours } = await request.json();
    const addHours = parseFloat(hours);

    if (isNaN(addHours) || addHours <= 0 || addHours > 1000) {
      return NextResponse.json({ error: "Hours must be between 0.1 and 1000" }, { status: 400 });
    }

    const currentLogged = parseFloat(String(task.logged_hours || "0"));
    const newLogged = (currentLogged + addHours).toFixed(1);

    // Sanity cap
    if (parseFloat(newLogged) > 100000) {
      return NextResponse.json({ error: "Total logged hours would exceed maximum" }, { status: 400 });
    }

    const [updatedTask] = await db
      .update(tasks)
      .set({
        logged_hours: String(newLogged),
        updated_at: new Date(),
      })
      .where(eq(tasks.id, taskId))
      .returning();

    return NextResponse.json({
      task: updatedTask,
      logged_hours: newLogged,
      message: `Successfully logged ${addHours} hours.`,
    });
  } catch (error: any) {
    console.error("Log time error:", error);
    return NextResponse.json({ error: "Failed to log time" }, { status: 500 });
  }
}
