import { NextResponse } from "next/server";
import { db } from "@/db";
import { comments, tasks, task_assignees, users } from "@/db/schema";
import { getSession, isValidUUID, MAX_COMMENT_LENGTH } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

async function verifyTaskAccess(taskId: string, userId: string, userRole: string) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) return false;
  if (userRole === "admin" || userRole === "manager") return true;
  if (task.created_by === userId) return true;

  const [assignment] = await db
    .select()
    .from(task_assignees)
    .where(and(eq(task_assignees.task_id, taskId), eq(task_assignees.user_id, userId)));

  return !!assignment;
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

  const hasAccess = await verifyTaskAccess(taskId, session.id, session.role);
  if (!hasAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const commentRows = await db
    .select({
      id: comments.id,
      body: comments.body,
      created_at: comments.created_at,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      },
    })
    .from(comments)
    .innerJoin(users, eq(comments.user_id, users.id))
    .where(eq(comments.task_id, taskId))
    .orderBy(comments.created_at);

  return NextResponse.json({ comments: commentRows });
}

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

  const hasAccess = await verifyTaskAccess(taskId, session.id, session.role);
  if (!hasAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const { body } = await request.json();
    if (!body || typeof body !== "string" || !body.trim()) {
      return NextResponse.json({ error: "Comment body cannot be empty" }, { status: 400 });
    }

    if (body.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json({ error: `Comment exceeds ${MAX_COMMENT_LENGTH} character limit` }, { status: 400 });
    }

    const [newComment] = await db
      .insert(comments)
      .values({
        task_id: taskId,
        user_id: session.id,
        body: body.trim(),
      })
      .returning();

    // Attach user details
    const [author] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, session.id));

    return NextResponse.json(
      {
        comment: {
          ...newComment,
          user: author,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Post comment error:", error);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
