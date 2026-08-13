import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, task_assignees, comments } from "@/db/schema";
import { getSession, isValidUUID, MAX_URL_LENGTH, MAX_DESCRIPTION_LENGTH } from "@/lib/auth";
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
    const { submission_link, submission_notes } = await request.json();

    if (!submission_link || typeof submission_link !== "string" || !submission_link.trim()) {
      return NextResponse.json({ error: "Deliverable URL is required" }, { status: 400 });
    }

    // Validate URL format
    const trimmedUrl = submission_link.trim();
    if (trimmedUrl.length > MAX_URL_LENGTH) {
      return NextResponse.json({ error: `URL exceeds ${MAX_URL_LENGTH} character limit` }, { status: 400 });
    }

    try {
      const urlObj = new URL(trimmedUrl);
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return NextResponse.json({ error: "URL must use http or https protocol" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Validate notes length
    if (submission_notes && submission_notes.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json({ error: `Notes exceed ${MAX_DESCRIPTION_LENGTH} character limit` }, { status: 400 });
    }

    const now = new Date();

    const [updatedTask] = await db
      .update(tasks)
      .set({
        submission_link: trimmedUrl,
        submission_notes: submission_notes ? submission_notes.trim() : null,
        submitted_at: now,
        status: "review", // Automatically move task to In Review upon submission
        updated_at: now,
      })
      .where(eq(tasks.id, taskId))
      .returning();

    // Insert auto-activity comment
    const commentBody = `📤 Submitted task deliverable link:\n${trimmedUrl}${
      submission_notes ? `\n\nNotes: ${submission_notes.trim()}` : ""
    }`;

    await db.insert(comments).values({
      task_id: taskId,
      user_id: session.id,
      body: commentBody,
    });

    return NextResponse.json({
      task: updatedTask,
      message: "Task deliverable submitted successfully for manager review!",
    });
  } catch (error: any) {
    console.error("Task submission error:", error);
    return NextResponse.json({ error: "Failed to submit deliverable" }, { status: 500 });
  }
}
