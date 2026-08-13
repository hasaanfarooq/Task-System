import { db } from "@/db";
import { tasks, task_assignees, task_tags, tags, users, comments } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { UserSession } from "./auth";

export interface TaskWithDetails {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  estimated_hours: string | null;
  logged_hours: string | null;
  time_limit: Date | null;
  due_date: Date | null;
  submission_link: string | null;
  submission_notes: string | null;
  submitted_at: Date | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  creator: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  assignees: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  commentCount: number;
}

export async function fetchTasksForUser(session: UserSession): Promise<TaskWithDetails[]> {
  let matchedTaskIds: string[] = [];

  if (session.role === "employee") {
    const assignedRows = await db
      .select({ taskId: task_assignees.task_id })
      .from(task_assignees)
      .where(eq(task_assignees.user_id, session.id));

    const assignedIds = assignedRows.map((r) => r.taskId);

    const createdRows = await db
      .select({ taskId: tasks.id })
      .from(tasks)
      .where(eq(tasks.created_by, session.id));

    const createdIds = createdRows.map((r) => r.taskId);

    matchedTaskIds = Array.from(new Set([...assignedIds, ...createdIds]));

    if (matchedTaskIds.length === 0) {
      return [];
    }
  }

  const rawTasks = session.role === "employee"
    ? await db.select().from(tasks).where(inArray(tasks.id, matchedTaskIds))
    : await db.select().from(tasks);

  if (rawTasks.length === 0) {
    return [];
  }

  const taskIds = rawTasks.map((t) => t.id);

  // Fetch creators
  const creatorIds = Array.from(new Set(rawTasks.map((t) => t.created_by)));
  const creatorRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(inArray(users.id, creatorIds));

  const creatorMap = new Map(creatorRows.map((u) => [u.id, u]));

  // Fetch assignees
  const assigneeRows = await db
    .select({
      taskId: task_assignees.task_id,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      },
    })
    .from(task_assignees)
    .innerJoin(users, eq(task_assignees.user_id, users.id))
    .where(inArray(task_assignees.task_id, taskIds));

  const assigneesByTaskId = new Map<string, Array<{ id: string; name: string; email: string; role: string }>>();
  for (const row of assigneeRows) {
    if (!assigneesByTaskId.has(row.taskId)) {
      assigneesByTaskId.set(row.taskId, []);
    }
    assigneesByTaskId.get(row.taskId)!.push(row.user);
  }

  // Fetch tags
  const tagRows = await db
    .select({
      taskId: task_tags.task_id,
      tag: {
        id: tags.id,
        name: tags.name,
        color: tags.color,
      },
    })
    .from(task_tags)
    .innerJoin(tags, eq(task_tags.tag_id, tags.id))
    .where(inArray(task_tags.task_id, taskIds));

  const tagsByTaskId = new Map<string, Array<{ id: string; name: string; color: string }>>();
  for (const row of tagRows) {
    if (!tagsByTaskId.has(row.taskId)) {
      tagsByTaskId.set(row.taskId, []);
    }
    tagsByTaskId.get(row.taskId)!.push(row.tag);
  }

  // Fetch comment counts
  const commentCounts = await db
    .select({
      taskId: comments.task_id,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(comments)
    .where(inArray(comments.task_id, taskIds))
    .groupBy(comments.task_id);

  const commentCountMap = new Map(commentCounts.map((c) => [c.taskId, c.count]));

  return rawTasks.map((t) => ({
    ...t,
    estimated_hours: t.estimated_hours ? String(t.estimated_hours) : null,
    logged_hours: t.logged_hours ? String(t.logged_hours) : "0",
    submission_link: t.submission_link || null,
    submission_notes: t.submission_notes || null,
    submitted_at: t.submitted_at || null,
    creator: creatorMap.get(t.created_by) || {
      id: t.created_by,
      name: "Unknown User",
      email: "",
      role: "employee",
    },
    assignees: assigneesByTaskId.get(t.id) || [],
    tags: tagsByTaskId.get(t.id) || [],
    commentCount: commentCountMap.get(t.id) || 0,
  }));
}
