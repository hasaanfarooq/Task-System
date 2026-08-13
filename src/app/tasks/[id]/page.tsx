import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { tasks, task_assignees, users, comments, tags, task_tags } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { TaskDetailClient } from "./TaskDetailClient";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { id: taskId } = await params;

  // Fetch task
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));

  if (!task) {
    redirect("/dashboard");
  }

  // Strict employee access check
  if (session.role === "employee" && task.created_by !== session.id) {
    const [assignment] = await db
      .select()
      .from(task_assignees)
      .where(and(eq(task_assignees.task_id, taskId), eq(task_assignees.user_id, session.id)));

    if (!assignment) {
      redirect("/dashboard");
    }
  }

  // Fetch Creator
  const [creator] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, task.created_by));

  // Fetch Assignees
  const assigneeRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(task_assignees)
    .innerJoin(users, eq(task_assignees.user_id, users.id))
    .where(eq(task_assignees.task_id, taskId));

  // Fetch Tags
  const tagRows = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
    })
    .from(task_tags)
    .innerJoin(tags, eq(task_tags.tag_id, tags.id))
    .where(eq(task_tags.task_id, taskId));

  // Fetch Comments
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

  // Fetch users (scoped by role for employee data isolation)
  const userQuery =
    session.role === "employee"
      ? db
          .select({ id: users.id, name: users.name, email: users.email, role: users.role })
          .from(users)
          .where(or(eq(users.role, "admin"), eq(users.role, "manager")))
      : db
          .select({ id: users.id, name: users.name, email: users.email, role: users.role })
          .from(users);

  const allUsers = await userQuery;

  const allTags = await db.select().from(tags);

  const formattedTask = {
    ...task,
    estimated_hours: task.estimated_hours ? String(task.estimated_hours) : null,
    logged_hours: task.logged_hours ? String(task.logged_hours) : "0",
    time_limit: task.time_limit ? task.time_limit.toISOString() : null,
    due_date: task.due_date ? task.due_date.toISOString() : null,
    submission_link: task.submission_link || null,
    submission_notes: task.submission_notes || null,
    submitted_at: task.submitted_at ? task.submitted_at.toISOString() : null,
    created_at: task.created_at.toISOString(),
    updated_at: task.updated_at.toISOString(),
    creator: creator || { id: task.created_by, name: "Unknown", email: "", role: "employee" },
    assignees: assigneeRows,
    tags: tagRows,
    comments: commentRows.map((c) => ({
      ...c,
      created_at: c.created_at.toISOString(),
    })),
  };

  return (
    <TaskDetailClient
      session={session}
      initialTask={formattedTask}
      allUsers={allUsers}
      allTags={allTags}
    />
  );
}
