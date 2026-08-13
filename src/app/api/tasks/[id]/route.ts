import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, task_assignees, task_tags, users, comments, tags } from "@/db/schema";
import {
  getSession,
  isValidUUID,
  isValidStatus,
  isValidPriority,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from "@/lib/auth";
import { eq, inArray, and } from "drizzle-orm";

async function verifyTaskAccess(taskId: string, userId: string, userRole: string) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) return { task: null, allowed: false };

  if (userRole === "admin" || userRole === "manager") {
    return { task, allowed: true };
  }

  if (task.created_by === userId) {
    return { task, allowed: true };
  }

  const [assignment] = await db
    .select()
    .from(task_assignees)
    .where(and(eq(task_assignees.task_id, taskId), eq(task_assignees.user_id, userId)));

  return { task, allowed: !!assignment };
}

export async function GET(
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

  const { task, allowed } = await verifyTaskAccess(taskId, session.id, session.role);
  if (!task || !allowed) {
    return NextResponse.json({ error: "Task not found or access denied" }, { status: 404 });
  }

  // Parallel fetch for performance
  const [creatorRows, assigneeRows, tagRows, commentRows] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, task.created_by)),
    db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(task_assignees)
      .innerJoin(users, eq(task_assignees.user_id, users.id))
      .where(eq(task_assignees.task_id, taskId)),
    db
      .select({ id: tags.id, name: tags.name, color: tags.color })
      .from(task_tags)
      .innerJoin(tags, eq(task_tags.tag_id, tags.id))
      .where(eq(task_tags.task_id, taskId)),
    db
      .select({
        id: comments.id,
        body: comments.body,
        created_at: comments.created_at,
        user: { id: users.id, name: users.name, email: users.email, role: users.role },
      })
      .from(comments)
      .innerJoin(users, eq(comments.user_id, users.id))
      .where(eq(comments.task_id, taskId))
      .orderBy(comments.created_at),
  ]);

  const creator = creatorRows[0] || { id: task.created_by, name: "Unknown", email: "", role: "employee" };

  return NextResponse.json({
    task: {
      ...task,
      estimated_hours: task.estimated_hours ? String(task.estimated_hours) : null,
      logged_hours: task.logged_hours ? String(task.logged_hours) : "0",
      creator,
      assignees: assigneeRows,
      tags: tagRows,
      comments: commentRows,
    },
  });
}

export async function PATCH(
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

  const { task, allowed } = await verifyTaskAccess(taskId, session.id, session.role);

  if (!task || !allowed) {
    return NextResponse.json({ error: "Task not found or access denied" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    // Validate and apply status
    if (body.status !== undefined) {
      if (!isValidStatus(body.status)) {
        return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
      }
      updateData.status = body.status;
    }

    // Validate and apply priority
    if (body.priority !== undefined) {
      if (!isValidPriority(body.priority)) {
        return NextResponse.json({ error: "Invalid priority value" }, { status: 400 });
      }
      // Employees cannot change priority
      if (session.role === "employee") {
        return NextResponse.json(
          { error: "Forbidden: Employees cannot change task priority" },
          { status: 403 }
        );
      }
      updateData.priority = body.priority;
    }

    // Title & Description — admin/manager only
    if (body.title !== undefined) {
      if (session.role === "employee") {
        return NextResponse.json({ error: "Forbidden: Employees cannot edit task title" }, { status: 403 });
      }
      if (typeof body.title !== "string" || body.title.trim().length === 0 || body.title.length > MAX_TITLE_LENGTH) {
        return NextResponse.json({ error: `Title must be 1-${MAX_TITLE_LENGTH} characters` }, { status: 400 });
      }
      updateData.title = body.title.trim();
    }

    if (body.description !== undefined) {
      if (session.role === "employee") {
        return NextResponse.json({ error: "Forbidden: Employees cannot edit task description" }, { status: 403 });
      }
      if (body.description && body.description.length > MAX_DESCRIPTION_LENGTH) {
        return NextResponse.json({ error: `Description exceeds ${MAX_DESCRIPTION_LENGTH} character limit` }, { status: 400 });
      }
      updateData.description = body.description;
    }

    // Time fields — admin/manager only for estimated; logged additive via /log-time
    if (body.estimated_hours !== undefined) {
      if (session.role === "employee") {
        return NextResponse.json({ error: "Forbidden: Employees cannot change estimated hours" }, { status: 403 });
      }
      const est = body.estimated_hours ? parseFloat(body.estimated_hours) : null;
      if (est !== null && (isNaN(est) || est < 0 || est > 10000)) {
        return NextResponse.json({ error: "Invalid estimated hours value" }, { status: 400 });
      }
      updateData.estimated_hours = est !== null ? String(est) : null;
    }

    if (body.logged_hours !== undefined) {
      if (session.role === "employee") {
        return NextResponse.json({ error: "Forbidden: Use the Log Time feature instead" }, { status: 403 });
      }
      const log = parseFloat(body.logged_hours);
      if (isNaN(log) || log < 0 || log > 100000) {
        return NextResponse.json({ error: "Invalid logged hours value" }, { status: 400 });
      }
      updateData.logged_hours = String(log);
    }

    if (body.time_limit !== undefined) {
      if (session.role === "employee") {
        return NextResponse.json({ error: "Forbidden: Employees cannot set time limits" }, { status: 403 });
      }
      updateData.time_limit = body.time_limit ? new Date(body.time_limit) : null;
    }

    if (body.due_date !== undefined) {
      if (session.role === "employee") {
        return NextResponse.json({ error: "Forbidden: Employees cannot set due dates" }, { status: 403 });
      }
      updateData.due_date = body.due_date ? new Date(body.due_date) : null;
    }

    const [updatedTask] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning();

    return NextResponse.json({ task: updatedTask });
  } catch (error: any) {
    console.error("Patch task error:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
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

  // Only admins and managers can delete tasks
  if (session.role === "employee") {
    return NextResponse.json(
      { error: "Forbidden: Employees cannot delete tasks" },
      { status: 403 }
    );
  }

  const { task, allowed } = await verifyTaskAccess(taskId, session.id, session.role);

  if (!task || !allowed) {
    return NextResponse.json({ error: "Task not found or access denied" }, { status: 403 });
  }

  await db.delete(tasks).where(eq(tasks.id, taskId));
  return NextResponse.json({ message: "Task deleted successfully" });
}
