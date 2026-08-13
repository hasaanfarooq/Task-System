import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { fetchTasksForUser } from "@/lib/tasks";
import { db } from "@/db";
import { users, tags } from "@/db/schema";
import { AdminClient } from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Admin access check
  if (session.role !== "admin") {
    redirect("/dashboard");
  }

  // Fetch all users with active screen time & last active timestamp
  const allUsers = await db
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

  // Fetch all tasks
  const allTasks = await fetchTasksForUser(session);

  // Fetch all tags
  const allTags = await db.select().from(tags);

  const formattedUsers = allUsers.map((u) => ({
    ...u,
    active_screen_time_seconds: u.active_screen_time_seconds || 0,
    last_active_at: u.last_active_at ? u.last_active_at.toISOString() : null,
    created_at: u.created_at.toISOString(),
  }));

  return (
    <AdminClient
      session={session}
      initialUsers={formattedUsers}
      initialTasks={allTasks}
      initialTags={allTags}
    />
  );
}
