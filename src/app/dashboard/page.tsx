import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { fetchTasksForUser } from "@/lib/tasks";
import { db } from "@/db";
import { users } from "@/db/schema";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch tasks with query-level RBAC
  const userTasks = await fetchTasksForUser(session);

  // Fetch user list for admin/manager overview
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users);

  return (
    <DashboardClient
      user={session}
      initialTasks={userTasks}
      allUsers={allUsers}
    />
  );
}
