"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { InviteUserModal } from "@/components/InviteUserModal";
import { TaskWithDetails } from "@/lib/tasks";
import {
  Users,
  Shield,
  Tag as TagIcon,
  Layers,
  Trash2,
  UserPlus,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Search,
  ExternalLink,
  UploadCloud,
  Pencil,
  KeyRound,
  X,
  Eye,
  EyeOff,
  Activity,
  Monitor,
} from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "employee";
  active_screen_time_seconds?: number;
  last_active_at?: string | null;
  created_at: string;
}

function formatScreenTime(seconds: number = 0): string {
  if (!seconds || seconds <= 0) return "0m";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ${seconds % 60}s`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

function isUserActiveNow(lastActiveAt?: string | null): boolean {
  if (!lastActiveAt) return false;
  const lastActiveTime = new Date(lastActiveAt).getTime();
  return Date.now() - lastActiveTime < 120000; // Active within last 2 minutes
}

interface TagItem {
  id: string;
  name: string;
  color: string;
}

interface AdminClientProps {
  session: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "manager" | "employee";
  };
  initialUsers: UserItem[];
  initialTasks: TaskWithDetails[];
  initialTags: TagItem[];
}

export function AdminClient({
  session,
  initialUsers,
  initialTasks,
  initialTags,
}: AdminClientProps) {
  const router = useRouter();
  const [usersList, setUsersList] = useState<UserItem[]>(initialUsers);
  const [tasksList, setTasksList] = useState<TaskWithDetails[]>(initialTasks);
  const [tagsList, setTagsList] = useState<TagItem[]>(initialTags);

  const [activeTab, setActiveTab] = useState<"users" | "tasks" | "tags" | "time" | "deliverables" | "screentime">("users");
  const [userSearch, setUserSearch] = useState("");
  const [taskSearch, setTaskSearch] = useState("");

  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#2563eb");
  const [creatingTag, setCreatingTag] = useState(false);

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);

  // User edit modal state
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editNewPassword, setEditNewPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const refreshAllData = async () => {
    try {
      const [uRes, tRes, tagRes] = await Promise.all([
        fetch("/api/users").then((r) => r.json()),
        fetch("/api/tasks").then((r) => r.json()),
        fetch("/api/tags").then((r) => r.json()),
      ]);

      if (uRes.users) setUsersList(uRes.users);
      if (tRes.tasks) setTasksList(tRes.tasks);
      if (tagRes.tags) setTagsList(tagRes.tags);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update role");

      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole as any } : u))
      );
      setMessage({ type: "success", text: `Updated user role to ${newRole}` });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === session.id) {
      alert("You cannot delete your own active admin account.");
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete user "${userName}"?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");

      setUsersList((prev) => prev.filter((u) => u.id !== userId));
      setMessage({ type: "success", text: `Deleted user ${userName}` });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    setCreatingTag(true);
    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create tag");

      setTagsList((prev) => [...prev, data.tag]);
      setNewTagName("");
      setMessage({ type: "success", text: `Created tag "${data.tag.name}"` });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setCreatingTag(false);
    }
  };

  const openEditUser = (user: UserItem) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditNewPassword("");
    setShowEditPassword(false);
  };

  const closeEditUser = () => {
    setEditingUser(null);
    setEditName("");
    setEditEmail("");
    setEditNewPassword("");
    setShowEditPassword(false);
    setEditSaving(false);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setEditSaving(true);

    try {
      const payload: Record<string, string> = {};
      if (editName.trim() !== editingUser.name) payload.name = editName.trim();
      if (editEmail.trim().toLowerCase() !== editingUser.email) payload.email = editEmail.trim();
      if (editNewPassword.trim()) payload.new_password = editNewPassword.trim();

      if (Object.keys(payload).length === 0) {
        closeEditUser();
        return;
      }

      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");

      setUsersList((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? { ...u, name: data.user.name, email: data.user.email, role: data.user.role }
            : u
        )
      );

      const changes: string[] = [];
      if (payload.name) changes.push("name");
      if (payload.email) changes.push("email");
      if (payload.new_password) changes.push("password");
      setMessage({ type: "success", text: `Updated ${changes.join(", ")} for ${data.user.name}` });
      setTimeout(() => setMessage(null), 3000);
      closeEditUser();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
      setEditSaving(false);
    }
  };

  const handleDeleteTag = async (tagId: string, tagName: string) => {
    if (!confirm(`Delete tag "${tagName}"?`)) return;

    try {
      const res = await fetch(`/api/admin/tags/${tagId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete tag");

      setTagsList((prev) => prev.filter((t) => t.id !== tagId));
      setMessage({ type: "success", text: `Deleted tag ${tagName}` });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const handleTaskTimeUpdate = async (taskId: string, newEst: string, newLogged: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimated_hours: newEst ? parseFloat(newEst) : null,
          logged_hours: parseFloat(newLogged || "0"),
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Task time limit updated successfully!" });
        setTimeout(() => setMessage(null), 3000);
        refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredTasks = tasksList.filter(
    (t) =>
      t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(taskSearch.toLowerCase()))
  );

  const submittedTasksList = tasksList.filter((t) => t.submission_link);

  const totalLoggedCompany = tasksList
    .reduce((acc, t) => acc + parseFloat(t.logged_hours || "0"), 0)
    .toFixed(1);

  const totalEstimatedCompany = tasksList
    .reduce((acc, t) => acc + (t.estimated_hours ? parseFloat(t.estimated_hours) : 0), 0)
    .toFixed(1);

  const totalTimeExceededTasks = tasksList.filter((t) => {
    const est = t.estimated_hours ? parseFloat(t.estimated_hours) : null;
    const log = parseFloat(t.logged_hours || "0");
    return est !== null && log > est;
  }).length;

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-stone-900 pb-16">
      <Navbar
        user={session}
        onOpenCreateTask={() => setIsCreateTaskOpen(true)}
        onOpenInviteUser={() => setIsInviteUserOpen(true)}
      />

      <main className="w-full px-6 sm:px-8 lg:px-12 pt-8 space-y-6">
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-6">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase tracking-wider text-rose-600 mb-1">
              <Shield className="h-4 w-4 text-rose-600" />
              <span>System Administration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Executive Admin Control Console
            </h1>
            <p className="text-base text-stone-600 font-medium mt-1">
              Manage system users, role authorizations, task overrides, deliverables, and tag taxonomy.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsInviteUserOpen(true)}
              className="inline-flex items-center space-x-2 rounded-md bg-stone-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-stone-800 shadow-xs"
            >
              <UserPlus className="h-4.5 w-4.5" />
              <span>Invite Member</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Message */}
        {message && (
          <div
            className={`flex items-center space-x-2 rounded-md border p-3.5 text-sm font-mono font-bold ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4.5 w-4.5 text-red-600" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* System Statistic Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 font-mono">
          <div className="rounded-md border border-stone-200 bg-white p-5 space-y-1 shadow-xs">
            <div className="text-xs font-bold text-stone-500 uppercase">USERS</div>
            <div className="text-3xl font-extrabold text-stone-900">{usersList.length}</div>
          </div>

          <div className="rounded-md border border-rose-200 bg-rose-50/50 p-5 space-y-1 shadow-xs">
            <div className="text-xs font-bold text-rose-700 uppercase">ADMINS</div>
            <div className="text-3xl font-extrabold text-rose-800">
              {usersList.filter((u) => u.role === "admin").length}
            </div>
          </div>

          <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-5 space-y-1 shadow-xs">
            <div className="text-xs font-bold text-emerald-800 uppercase">DELIVERABLES</div>
            <div className="text-3xl font-extrabold text-emerald-800">{submittedTasksList.length} submitted</div>
          </div>

          <div className="rounded-md border border-stone-200 bg-white p-5 space-y-1 shadow-xs">
            <div className="text-xs font-bold text-stone-500 uppercase">LOGGED TIME</div>
            <div className="text-3xl font-extrabold text-stone-900">
              {totalLoggedCompany}h <span className="text-stone-400 font-normal">/ {totalEstimatedCompany}h</span>
            </div>
          </div>

          <div className="rounded-md border border-red-200 bg-red-50/50 p-5 space-y-1 shadow-xs">
            <div className="text-xs font-bold text-red-700 uppercase">TIME EXCEEDED</div>
            <div className="text-3xl font-extrabold text-red-800">{totalTimeExceededTasks} tasks</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-stone-200 pb-3 font-mono text-sm font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center space-x-2 rounded px-4 py-2 whitespace-nowrap shrink-0 transition-colors ${
              activeTab === "users"
                ? "bg-stone-900 text-white font-extrabold"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            <Users className="h-4.5 w-4.5 shrink-0" />
            <span>User Management ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center space-x-2 rounded px-4 py-2 whitespace-nowrap shrink-0 transition-colors ${
              activeTab === "tasks"
                ? "bg-stone-900 text-white font-extrabold"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            <Layers className="h-4.5 w-4.5 shrink-0" />
            <span>Tasks Control ({tasksList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("deliverables")}
            className={`flex items-center space-x-2 rounded px-4 py-2 whitespace-nowrap shrink-0 transition-colors ${
              activeTab === "deliverables"
                ? "bg-stone-900 text-white font-extrabold"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            <UploadCloud className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
            <span>Submitted Deliverables ({submittedTasksList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("time")}
            className={`flex items-center space-x-2 rounded px-4 py-2 whitespace-nowrap shrink-0 transition-colors ${
              activeTab === "time"
                ? "bg-stone-900 text-white font-extrabold"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            <Clock className="h-4.5 w-4.5 text-amber-500 shrink-0" />
            <span>Time Limits & Audit</span>
          </button>

          <button
            onClick={() => setActiveTab("screentime")}
            className={`flex items-center space-x-2 rounded px-4 py-2 whitespace-nowrap shrink-0 transition-colors ${
              activeTab === "screentime"
                ? "bg-stone-900 text-white font-extrabold"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            <Activity className="h-4.5 w-4.5 text-blue-500 shrink-0" />
            <span>Screen Time Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab("tags")}
            className={`flex items-center space-x-2 rounded px-4 py-2 whitespace-nowrap shrink-0 transition-colors ${
              activeTab === "tags"
                ? "bg-stone-900 text-white font-extrabold"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            <TagIcon className="h-4.5 w-4.5 shrink-0" />
            <span>Tags ({tagsList.length})</span>
          </button>
        </div>

        {/* TAB 1: USERS */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-md border border-stone-200 bg-white p-4 shadow-xs">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-stone-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user by name, email, or role..."
                  className="w-full rounded border border-stone-300 bg-white pl-10 pr-4 py-2 text-sm sm:text-base text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-none"
                />
              </div>

              <div className="text-xs font-mono font-bold text-stone-500">
                Showing {filteredUsers.length} of {usersList.length} users
              </div>
            </div>

            <div className="rounded-md border border-stone-200 bg-white overflow-hidden shadow-xs">
              <table className="w-full text-left text-sm sm:text-base">
                <thead className="border-b border-stone-200 bg-stone-50/90 font-mono text-xs font-bold text-stone-600 uppercase tracking-wider select-none">
                  <tr>
                    <th className="py-4 px-6">User</th>
                    <th className="py-4 px-6">Email Address</th>
                    <th className="py-4 px-6">Live Status</th>
                    <th className="py-4 px-6">Active Screen Time</th>
                    <th className="py-4 px-6">Role Authorization</th>
                    <th className="py-4 px-6">Assigned Tasks</th>
                    <th className="py-4 px-6 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-900">
                    {filteredUsers.map((u) => {
                      const userTasksCount = tasksList.filter((t) =>
                        t.assignees.some((a) => a.id === u.id)
                      ).length;
                      const activeNow = isUserActiveNow(u.last_active_at);

                      return (
                        <tr key={u.id} className="hover:bg-stone-50/90 transition-colors">
                          <td className="py-4 px-6 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                <div className="flex h-8 w-8 items-center justify-center rounded bg-stone-200 font-mono text-sm font-bold text-stone-800">
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                                <span
                                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                                    activeNow ? "bg-emerald-500" : "bg-stone-300"
                                  }`}
                                  title={activeNow ? "Active Now" : "Offline"}
                                />
                              </div>
                              <div>
                                <div className="font-bold text-stone-900 text-base">{u.name}</div>
                                {u.id === session.id && (
                                  <span className="text-xs font-mono font-bold text-rose-600 uppercase">
                                    (You)
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-6 whitespace-nowrap font-mono text-sm text-stone-700">
                            {u.email}
                          </td>

                          <td className="py-4 px-6 whitespace-nowrap font-mono text-xs font-bold">
                            {activeNow ? (
                              <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-emerald-700">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Active Now</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-stone-500">
                                <span className="h-2 w-2 rounded-full bg-stone-300" />
                                <span>Offline</span>
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-6 whitespace-nowrap font-mono text-sm font-extrabold text-stone-900">
                            <div className="flex items-center space-x-1.5">
                              <Monitor className="h-4 w-4 text-blue-600" />
                              <span>{formatScreenTime(u.active_screen_time_seconds)}</span>
                            </div>
                          </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            disabled={u.id === session.id}
                            className="rounded border border-stone-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-mono font-bold text-stone-900 focus:border-stone-900 focus:outline-none uppercase disabled:opacity-60"
                          >
                            <option value="employee">Employee</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap font-mono text-sm font-bold text-stone-800">
                          {userTasksCount} tasks
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap text-right pr-6">
                          {u.id !== session.id ? (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => openEditUser(u)}
                                className="inline-flex items-center space-x-1.5 rounded border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-mono font-bold text-stone-700 hover:bg-stone-100 transition-colors"
                                title="Edit user"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                className="inline-flex items-center space-x-1.5 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-mono font-bold text-red-700 hover:bg-red-100 transition-colors"
                                title="Delete user"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Delete</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-mono text-stone-400 italic">Active Self</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: TASKS OVERRIDE */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-md border border-stone-200 bg-white p-4 shadow-xs">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-stone-400" />
                <input
                  type="text"
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  placeholder="Search all tasks..."
                  className="w-full rounded border border-stone-300 bg-white pl-10 pr-4 py-2 text-sm sm:text-base text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-none"
                />
              </div>

              <button
                onClick={() => setIsCreateTaskOpen(true)}
                className="inline-flex items-center space-x-2 rounded-md bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800"
              >
                <Plus className="h-4 w-4" />
                <span>Create Task</span>
              </button>
            </div>

            <div className="rounded-md border border-stone-200 bg-white overflow-hidden shadow-xs">
              <table className="w-full text-left text-sm sm:text-base">
                <thead className="border-b border-stone-200 bg-stone-50/90 font-mono text-xs font-bold text-stone-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-4 px-6">Task Title</th>
                    <th className="py-4 px-6">Status Override</th>
                    <th className="py-4 px-6">Priority</th>
                    <th className="py-4 px-6">Creator</th>
                    <th className="py-4 px-6 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-900">
                  {filteredTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-stone-50/90 transition-colors">
                      <td className="py-4 px-6 font-bold text-stone-900 text-sm sm:text-base">
                        {t.title}
                      </td>

                      <td className="py-4 px-6">
                        <select
                          value={t.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            await fetch(`/api/tasks/${t.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: newStatus }),
                            });
                            refreshAllData();
                          }}
                          className="rounded border border-stone-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-mono font-semibold text-stone-800 focus:border-stone-900 focus:outline-none"
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="review">In Review</option>
                          <option value="done">Done</option>
                        </select>
                      </td>

                      <td className="py-4 px-6">
                        <select
                          value={t.priority}
                          onChange={async (e) => {
                            const newPriority = e.target.value;
                            await fetch(`/api/tasks/${t.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ priority: newPriority }),
                            });
                            refreshAllData();
                          }}
                          className="rounded border border-stone-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-mono font-semibold text-stone-800 uppercase focus:border-stone-900 focus:outline-none"
                        >
                          <option value="urgent">Urgent</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </td>

                      <td className="py-4 px-6 font-mono text-sm text-stone-700 font-medium">
                        {t.creator.name}
                      </td>

                      <td className="py-4 px-6 text-right pr-6 whitespace-nowrap">
                        <button
                          onClick={async () => {
                            if (!confirm(`Delete task "${t.title}"?`)) return;
                            await fetch(`/api/tasks/${t.id}`, { method: "DELETE" });
                            refreshAllData();
                          }}
                          className="inline-flex items-center space-x-1.5 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-mono font-bold text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete Task</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: DELIVERABLES AUDIT */}
        {activeTab === "deliverables" && (
          <div className="space-y-4">
            <div className="rounded-md border border-stone-200 bg-white p-5 space-y-2 shadow-xs">
              <h2 className="text-sm font-mono font-bold uppercase text-stone-700">
                Submitted Task Deliverables Audit (Google Drive / Figma / GitHub Links)
              </h2>
              <p className="text-xs text-stone-500 font-mono">
                Inspect deliverable links submitted by assigned employees across all workspace tasks with full submitter email details.
              </p>
            </div>

            <div className="rounded-md border border-stone-200 bg-white overflow-hidden shadow-xs">
              <table className="w-full text-left text-sm sm:text-base">
                <thead className="border-b border-stone-200 bg-stone-50/90 font-mono text-xs font-bold text-stone-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-4 px-6">Task Title</th>
                    <th className="py-4 px-6">Submitter Name & Email</th>
                    <th className="py-4 px-6">Deliverable Notes</th>
                    <th className="py-4 px-6 text-right pr-6">External Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-900">
                  {submittedTasksList.map((t) => {
                    const submitters = t.assignees.length > 0 ? t.assignees : [t.creator];

                    return (
                      <tr key={t.id} className="hover:bg-stone-50/90 transition-colors">
                        <td className="py-4 px-6 font-bold text-stone-900">
                          {t.title}
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <div className="font-bold text-stone-900 text-sm sm:text-base">
                              {submitters.map((s) => s.name).join(", ")}
                            </div>
                            <div className="font-mono text-xs text-blue-600 font-semibold">
                              {submitters.map((s) => s.email).join(", ")}
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-stone-700 text-sm">
                          {t.submission_notes || <span className="italic text-stone-400">—</span>}
                        </td>

                        <td className="py-4 px-6 text-right pr-6 whitespace-nowrap">
                          <a
                            href={t.submission_link!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1.5 rounded bg-emerald-700 px-3.5 py-1.5 text-xs font-mono font-bold text-white hover:bg-emerald-800 shadow-2xs"
                          >
                            <span>Open Link</span>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}

                  {submittedTasksList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-stone-500 text-base italic">
                        No task deliverables have been submitted yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: TIME LIMITS & AUDIT */}
        {activeTab === "time" && (
          <div className="space-y-4">
            <div className="rounded-md border border-stone-200 bg-white p-5 space-y-2 shadow-xs">
              <h2 className="text-sm font-mono font-bold uppercase text-stone-700">
                Admin Task Time Limit & Hours Override Control
              </h2>
              <p className="text-xs text-stone-500 font-mono">
                Admin privileges to edit estimated hours and logged time across all active tasks.
              </p>
            </div>

            <div className="rounded-md border border-stone-200 bg-white overflow-hidden shadow-xs">
              <table className="w-full text-left text-sm sm:text-base font-mono">
                <thead className="border-b border-stone-200 bg-stone-50/90 text-xs font-bold text-stone-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-4 px-6">Task Title</th>
                    <th className="py-4 px-6">Estimated Hours (Limit)</th>
                    <th className="py-4 px-6">Logged Hours</th>
                    <th className="py-4 px-6">Time Limit Status</th>
                    <th className="py-4 px-6 text-right pr-6">Save Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-900">
                  {tasksList.map((t) => {
                    const est = t.estimated_hours ? parseFloat(t.estimated_hours) : null;
                    const log = parseFloat(t.logged_hours || "0");
                    const exceeded = est !== null && log > est;

                    return (
                      <tr key={t.id} className="hover:bg-stone-50/90 transition-colors">
                        <td className="py-4 px-6 font-bold text-stone-900 font-sans">
                          {t.title}
                        </td>

                        <td className="py-4 px-6">
                          <input
                            type="number"
                            step="0.5"
                            defaultValue={t.estimated_hours || ""}
                            id={`est-${t.id}`}
                            className="w-28 rounded border border-stone-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-bold text-stone-900 focus:border-stone-900 focus:outline-none"
                          />
                        </td>

                        <td className="py-4 px-6">
                          <input
                            type="number"
                            step="0.5"
                            defaultValue={t.logged_hours || "0"}
                            id={`log-${t.id}`}
                            className="w-28 rounded border border-stone-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-bold text-stone-900 focus:border-stone-900 focus:outline-none"
                          />
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          {exceeded ? (
                            <span className="rounded bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-bold text-red-600 uppercase">
                              Time Exceeded (+{(log - est).toFixed(1)}h)
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-800 uppercase">
                              Within Limit ({log} / {est || "∞"}h)
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right pr-6 whitespace-nowrap">
                          <button
                            onClick={() => {
                              const estInput = (document.getElementById(`est-${t.id}`) as HTMLInputElement)?.value;
                              const logInput = (document.getElementById(`log-${t.id}`) as HTMLInputElement)?.value;
                              handleTaskTimeUpdate(t.id, estInput, logInput);
                            }}
                            className="inline-flex items-center space-x-1.5 rounded bg-stone-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-stone-800"
                          >
                            <span>Save Time</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: SCREEN TIME ANALYTICS */}
        {activeTab === "screentime" && (
          <div className="space-y-6">
            <div className="rounded-md border border-stone-200 bg-white p-6 space-y-3 shadow-xs">
              <div className="flex items-center space-x-2 font-mono text-xs font-bold uppercase tracking-wider text-blue-600">
                <Activity className="h-4 w-4 text-blue-600" />
                <span>Executive Screen Time Monitoring & Live Presence</span>
              </div>
              <h2 className="text-xl font-extrabold text-stone-900">
                User Screen Time Leaderboard & Active Status
              </h2>
              <p className="text-sm text-stone-600">
                Real-time active screen time tracking recorded automatically while users are active in the application workspace. Restricting visibility strictly to Admin accounts.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 font-mono">
                <div className="rounded border border-stone-200 bg-stone-50 p-4">
                  <div className="text-xs font-bold text-stone-500 uppercase">ACTIVE USERS NOW</div>
                  <div className="text-2xl font-extrabold text-emerald-600 flex items-center space-x-2 mt-1">
                    <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{usersList.filter((u) => isUserActiveNow(u.last_active_at)).length} online</span>
                  </div>
                </div>

                <div className="rounded border border-stone-200 bg-stone-50 p-4">
                  <div className="text-xs font-bold text-stone-500 uppercase">TOTAL COMPANY SCREEN TIME</div>
                  <div className="text-2xl font-extrabold text-stone-900 mt-1">
                    {formatScreenTime(
                      usersList.reduce((acc, u) => acc + (u.active_screen_time_seconds || 0), 0)
                    )}
                  </div>
                </div>

                <div className="rounded border border-stone-200 bg-stone-50 p-4">
                  <div className="text-xs font-bold text-stone-500 uppercase">TRACKED USERS</div>
                  <div className="text-2xl font-extrabold text-stone-900 mt-1">
                    {usersList.length} members
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-stone-200 bg-white overflow-hidden shadow-xs">
              <table className="w-full text-left text-sm sm:text-base">
                <thead className="border-b border-stone-200 bg-stone-50/90 font-mono text-xs font-bold text-stone-600 uppercase tracking-wider select-none">
                  <tr>
                    <th className="py-4 px-6">Rank</th>
                    <th className="py-4 px-6">User</th>
                    <th className="py-4 px-6">Role</th>
                    <th className="py-4 px-6">Live Status</th>
                    <th className="py-4 px-6 text-right pr-6">Total Active Screen Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-900 font-mono text-sm">
                  {[...usersList]
                    .sort(
                      (a, b) =>
                        (b.active_screen_time_seconds || 0) - (a.active_screen_time_seconds || 0)
                    )
                    .map((u, idx) => {
                      const activeNow = isUserActiveNow(u.last_active_at);
                      return (
                        <tr key={u.id} className="hover:bg-stone-50/90 transition-colors">
                          <td className="py-4 px-6 font-extrabold text-stone-400">
                            #{idx + 1}
                          </td>
                          <td className="py-4 px-6 font-sans">
                            <div className="flex items-center space-x-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded bg-stone-200 font-mono text-sm font-bold text-stone-800">
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-stone-900">{u.name}</div>
                                <div className="text-xs text-stone-500 font-mono">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 uppercase font-bold text-xs">
                            <span className="rounded bg-stone-100 border border-stone-200 px-2 py-1 text-stone-800">
                              {u.role}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-bold text-xs">
                            {activeNow ? (
                              <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-emerald-700">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Active Now</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-stone-500">
                                <span className="h-2 w-2 rounded-full bg-stone-300" />
                                <span>Offline</span>
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right pr-6 font-extrabold text-base text-stone-900">
                            <div className="flex items-center justify-end space-x-1.5">
                              <Monitor className="h-4.5 w-4.5 text-blue-600" />
                              <span>{formatScreenTime(u.active_screen_time_seconds)}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: TAGS */}
        {activeTab === "tags" && (
          <div className="space-y-6">
            <div className="rounded-md border border-stone-200 bg-white p-5 space-y-4 shadow-xs">
              <h2 className="text-sm font-mono font-bold uppercase text-stone-700">
                Create New Workspace Tag
              </h2>

              <form onSubmit={handleCreateTag} className="flex flex-col sm:flex-row items-end gap-4">
                <div className="flex-1 space-y-1">
                  <label className="block font-mono text-xs font-bold uppercase text-stone-600">
                    Tag Name *
                  </label>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="e.g. Infrastructure, Security, Design System"
                    className="w-full rounded border border-stone-300 bg-white px-3.5 py-2 text-sm sm:text-base text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-mono text-xs font-bold uppercase text-stone-600">
                    Tag Color Hex *
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="h-10 w-12 rounded border border-stone-300 p-1 cursor-pointer bg-white"
                    />
                    <input
                      type="text"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-28 font-mono rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-stone-900 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingTag || !newTagName.trim()}
                  className="inline-flex items-center space-x-2 rounded-md bg-stone-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800 disabled:opacity-50"
                >
                  {creatingTag ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span>Create Tag</span>
                </button>
              </form>
            </div>

            <div className="space-y-3">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-600">
                Current Active Tags ({tagsList.length})
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {tagsList.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between rounded-md border border-stone-200 bg-white p-4 shadow-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span
                        className="h-4 w-4 rounded-full border border-stone-300"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="font-bold text-sm sm:text-base text-stone-900">
                        {tag.name}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteTag(tag.id, tag.name)}
                      className="p-1.5 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete tag"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onTaskCreated={refreshAllData}
      />

      <InviteUserModal
        isOpen={isInviteUserOpen}
        onClose={() => setIsInviteUserOpen(false)}
        onUserInvited={refreshAllData}
      />

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-stone-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-extrabold text-stone-900">Edit User</h2>
                <p className="text-xs font-mono text-stone-500 mt-0.5">
                  {editingUser.email} &middot; {editingUser.role.toUpperCase()}
                </p>
              </div>
              <button
                onClick={closeEditUser}
                className="rounded p-1 text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-stone-600">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-none"
                  placeholder="User full name"
                  maxLength={100}
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-stone-600">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-none"
                  placeholder="user@company.com"
                />
              </div>

              {/* Reset Password */}
              <div className="space-y-1.5">
                <label className="flex items-center space-x-1.5 text-xs font-mono font-bold uppercase tracking-wider text-stone-600">
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Reset Password (optional)</span>
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    className="w-full rounded border border-stone-300 bg-white px-3 py-2 pr-10 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-none"
                    placeholder="Leave blank to keep current password"
                    maxLength={128}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-2 top-2 p-0.5 text-stone-400 hover:text-stone-700"
                  >
                    {showEditPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {editNewPassword && editNewPassword.length < 6 && (
                  <p className="text-xs font-mono text-red-500">Minimum 6 characters required</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 border-t border-stone-200 px-6 py-4">
              <button
                onClick={closeEditUser}
                className="rounded border border-stone-300 px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                disabled={editSaving || (editNewPassword.length > 0 && editNewPassword.length < 6)}
                className="inline-flex items-center space-x-2 rounded bg-stone-900 px-5 py-2 text-sm font-bold text-white hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
