import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, task_assignees, task_tags } from "@/db/schema";
import {
  getSession,
  isValidStatus,
  isValidPriority,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from "@/lib/auth";
import { fetchTasksForUser } from "@/lib/tasks";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userTasks = await fetchTasksForUser(session);
  return NextResponse.json({ tasks: userTasks });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Employee creation block
  if (session.role === "employee") {
    return NextResponse.json(
      { error: "Forbidden: Employees are not allowed to create new tasks. Only Admins and Managers can assign tasks." },
      { status: 403 }
    );
  }

  try {
    const {
      title,
      description,
      status,
      priority,
      estimated_hours,
      time_limit,
      due_date,
      assignee_ids,
      tag_ids,
    } = await request.json();

    // Validate title
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json({ error: `Title exceeds ${MAX_TITLE_LENGTH} character limit` }, { status: 400 });
    }

    // Validate description length
    if (description && description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json({ error: `Description exceeds ${MAX_DESCRIPTION_LENGTH} character limit` }, { status: 400 });
    }

    // Validate status/priority enums
    const taskStatus = status || "todo";
    const taskPriority = priority || "medium";
    if (!isValidStatus(taskStatus)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }
    if (!isValidPriority(taskPriority)) {
      return NextResponse.json({ error: "Invalid priority value" }, { status: 400 });
    }

    // Validate estimated hours
    let estHours: string | null = null;
    if (estimated_hours !== undefined && estimated_hours !== null) {
      const parsed = parseFloat(estimated_hours);
      if (isNaN(parsed) || parsed < 0 || parsed > 10000) {
        return NextResponse.json({ error: "Invalid estimated hours" }, { status: 400 });
      }
      estHours = String(parsed);
    }

    const [newTask] = await db
      .insert(tasks)
      .values({
        title: title.trim(),
        description: description || null,
        status: taskStatus,
        priority: taskPriority,
        estimated_hours: estHours,
        logged_hours: "0",
        time_limit: time_limit ? new Date(time_limit) : null,
        due_date: due_date ? new Date(due_date) : null,
        created_by: session.id,
      })
      .returning();

    // Link assignees
    if (Array.isArray(assignee_ids) && assignee_ids.length > 0) {
      await db.insert(task_assignees).values(
        assignee_ids.map((userId: string) => ({
          task_id: newTask.id,
          user_id: userId,
        }))
      );
    }

    // Link tags
    if (Array.isArray(tag_ids) && tag_ids.length > 0) {
      await db.insert(task_tags).values(
        tag_ids.map((tagId: string) => ({
          task_id: newTask.id,
          tag_id: tagId,
        }))
      );
    }

    return NextResponse.json({ task: newTask }, { status: 201 });
  } catch (error: any) {
    console.error("Task creation error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
