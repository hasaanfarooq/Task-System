"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { TaskTableView } from "@/components/TaskTableView";
import { KanbanBoard } from "@/components/KanbanBoard";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { InviteUserModal } from "@/components/InviteUserModal";
import { TaskWithDetails } from "@/lib/tasks";
import {
  List,
  Columns,
  Users,
  Search,
  AlertCircle,
  Clock,
  CheckCircle2,
  Layers,
  UserPlus,
} from "lucide-react";

interface UserSession {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "employee";
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface DashboardClientProps {
  user: UserSession;
  initialTasks: TaskWithDetails[];
  allUsers: UserOption[];
}

export function DashboardClient({ user, initialTasks, allUsers }: DashboardClientProps) {
  const [tasks, setTasks] = useState<TaskWithDetails[]>(initialTasks);
  const [viewMode, setViewMode] = useState<"table" | "kanban" | "team">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);

  const refreshData = async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;

    return matchesSearch && matchesPriority && matchesStatus;
  });

  const totalTasks = tasks.length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const overdueCount = tasks.filter((t) => {
    if (!t.due_date || t.status === "done") return false;
    return new Date(t.due_date).getTime() < new Date().getTime();
  }).length;

  const employeeMatrix = allUsers.map((u) => {
    const assignedTasks = tasks.filter((t) =>
      t.assignees.some((a) => a.id === u.id)
    );
    const todo = assignedTasks.filter((t) => t.status === "todo").length;
    const inProgress = assignedTasks.filter((t) => t.status === "in_progress").length;
    const review = assignedTasks.filter((t) => t.status === "review").length;
    const done = assignedTasks.filter((t) => t.status === "done").length;

    const overdue = assignedTasks.filter((t) => {
      if (!t.due_date || t.status === "done") return false;
      return new Date(t.due_date).getTime() < new Date().getTime();
    }).length;

    return {
      user: u,
      totalAssigned: assignedTasks.length,
      todo,
      inProgress,
      review,
      done,
      overdue,
      completionRate:
        assignedTasks.length > 0 ? Math.round((done / assignedTasks.length) * 100) : 0,
    };
  });

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-stone-900 pb-16">
      <Navbar
        user={user}
        onOpenCreateTask={() => setIsCreateTaskOpen(true)}
        onOpenInviteUser={() => setIsInviteUserOpen(true)}
      />

      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full px-6 sm:px-8 lg:px-12 pt-8 space-y-6"
      >
        {/* Workspace Title & View Mode Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              {user.role === "employee" ? "My Workspace Tasks" : "Team Operations Dashboard"}
            </h1>
            <p className="text-base text-stone-600 font-medium mt-1">
              {user.role === "employee"
                ? "Internal isolated task list assigned to or created by you."
                : "Company-wide task backlog, sprint status, and workload metrics."}
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center space-x-1.5 rounded-md border border-stone-300 bg-stone-100 p-1.5 self-start sm:self-auto shadow-2xs">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center space-x-2 rounded px-4 py-2 font-mono text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-stone-900 border border-stone-200 shadow-2xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <List className="h-4.5 w-4.5" />
              <span>List</span>
            </button>

            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center space-x-2 rounded px-4 py-2 font-mono text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-white text-stone-900 border border-stone-200 shadow-2xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Columns className="h-4.5 w-4.5" />
              <span>Board</span>
            </button>

            {(user.role === "admin" || user.role === "manager") && (
              <button
                onClick={() => setViewMode("team")}
                className={`flex items-center space-x-2 rounded px-4 py-2 font-mono text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  viewMode === "team"
                    ? "bg-white text-stone-900 border border-stone-200 shadow-2xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Users className="h-4.5 w-4.5" />
                <span>Team</span>
                {employeeMatrix.some((e) => e.overdue > 0) && (
                  <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Statistic Summary Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            whileHover={{ y: -2, transition: { duration: 0.15 } }}
            className="rounded-md border border-stone-200 bg-white p-5 sm:p-6 space-y-2 shadow-xs"
          >
            <div className="flex items-center justify-between text-stone-500 font-mono text-xs sm:text-sm font-bold uppercase tracking-wider">
              <span>TOTAL TASKS</span>
              <Layers className="h-4.5 w-4.5 text-stone-400" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-stone-900">{totalTasks}</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2, transition: { duration: 0.15 } }}
            className="rounded-md border border-stone-200 bg-white p-5 sm:p-6 space-y-2 shadow-xs"
          >
            <div className="flex items-center justify-between text-stone-500 font-mono text-xs sm:text-sm font-bold uppercase tracking-wider">
              <span>IN PROGRESS</span>
              <Clock className="h-4.5 w-4.5 text-amber-500" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-amber-700">{inProgressCount}</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2, transition: { duration: 0.15 } }}
            className="rounded-md border border-stone-200 bg-white p-5 sm:p-6 space-y-2 shadow-xs"
          >
            <div className="flex items-center justify-between text-stone-500 font-mono text-xs sm:text-sm font-bold uppercase tracking-wider">
              <span>OVERDUE</span>
              <AlertCircle className="h-4.5 w-4.5 text-red-500" />
            </div>
            <div className={`text-3xl sm:text-4xl font-extrabold font-mono ${overdueCount > 0 ? "text-red-600" : "text-stone-900"}`}>
              {overdueCount}
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2, transition: { duration: 0.15 } }}
            className="rounded-md border border-stone-200 bg-white p-5 sm:p-6 space-y-2 shadow-xs"
          >
            <div className="flex items-center justify-between text-stone-500 font-mono text-xs sm:text-sm font-bold uppercase tracking-wider">
              <span>COMPLETED</span>
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-700">{doneCount}</div>
          </motion.div>
        </div>

        {/* Main Content Area */}
        <AnimatePresence mode="wait">
          {viewMode === "team" && (user.role === "admin" || user.role === "manager") ? (
            <motion.div
              key="team-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-stone-700">
                  Team Workload & Overdue Flags
                </h2>
                {user.role === "admin" && (
                  <button
                    onClick={() => setIsInviteUserOpen(true)}
                    className="inline-flex items-center space-x-2 rounded border border-stone-300 bg-white px-3.5 py-2 text-sm font-bold text-stone-800 hover:bg-stone-50"
                  >
                    <UserPlus className="h-4.5 w-4.5" />
                    <span>Invite Member</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {employeeMatrix.map(({ user: emp, totalAssigned, todo, inProgress, review, done, overdue, completionRate }) => (
                  <motion.div
                    key={emp.id}
                    whileHover={{ y: -2 }}
                    className="rounded-md border border-stone-200 bg-white p-6 space-y-4 shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
                      <div className="flex items-center space-x-3.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded bg-stone-200 font-mono text-base font-bold text-stone-800">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-base font-bold text-stone-900">{emp.name}</div>
                          <div className="text-xs font-mono text-stone-500">{emp.email}</div>
                        </div>
                      </div>
                      <span className="rounded bg-stone-100 px-2.5 py-1 font-mono text-xs uppercase font-bold text-stone-700 border border-stone-200">
                        {emp.role}
                      </span>
                    </div>

                    {overdue > 0 && (
                      <div className="flex items-center space-x-2 rounded border border-red-200 bg-red-50 p-3 text-xs sm:text-sm font-mono text-red-700 font-bold">
                        <AlertCircle className="h-4.5 w-4.5 text-red-600" />
                        <span>{overdue} Overdue Task{overdue > 1 ? "s" : ""}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs sm:text-sm">
                      <div className="rounded border border-stone-200 bg-stone-50 p-2.5">
                        <div className="font-bold text-stone-900 text-base">{todo}</div>
                        <div className="text-xs text-stone-500 uppercase mt-0.5 font-bold">TODO</div>
                      </div>
                      <div className="rounded border border-amber-200 bg-amber-50/50 p-2.5">
                        <div className="font-bold text-amber-800 text-base">{inProgress}</div>
                        <div className="text-xs text-amber-700 uppercase mt-0.5 font-bold">PROG</div>
                      </div>
                      <div className="rounded border border-indigo-200 bg-indigo-50/50 p-2.5">
                        <div className="font-bold text-indigo-800 text-base">{review}</div>
                        <div className="text-xs text-indigo-700 uppercase mt-0.5 font-bold">REV</div>
                      </div>
                      <div className="rounded border border-emerald-200 bg-emerald-50/50 p-2.5">
                        <div className="font-bold text-emerald-800 text-base">{done}</div>
                        <div className="text-xs text-emerald-700 uppercase mt-0.5 font-bold">DONE</div>
                      </div>
                    </div>

                    <div className="space-y-1.5 font-mono text-xs sm:text-sm">
                      <div className="flex justify-between text-stone-600">
                        <span>Completion</span>
                        <span className="font-bold text-stone-900">{completionRate}%</span>
                      </div>
                      <div className="h-2.5 w-full rounded bg-stone-100 overflow-hidden border border-stone-200">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${completionRate}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className="h-full bg-stone-900 rounded-sm"
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="task-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-md border border-stone-200 bg-white p-4 shadow-xs">
                <div className="relative w-full sm:w-[480px]">
                  <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter tasks by title or description..."
                    className="w-full rounded border border-stone-300 bg-white pl-10 pr-4 py-2.5 text-sm sm:text-base text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-none"
                  />
                </div>

                <div className="flex items-center space-x-3 w-full sm:w-auto justify-end text-sm sm:text-base">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded border border-stone-300 bg-white px-4 py-2.5 text-sm sm:text-base text-stone-900 focus:border-stone-900 focus:outline-none font-semibold cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">In Review</option>
                    <option value="done">Done</option>
                  </select>

                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="rounded border border-stone-300 bg-white px-4 py-2.5 text-sm sm:text-base text-stone-900 focus:border-stone-900 focus:outline-none font-semibold cursor-pointer"
                  >
                    <option value="all">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>

                  {(statusFilter !== "all" || priorityFilter !== "all" || searchQuery !== "") && (
                    <button
                      onClick={() => {
                        setStatusFilter("all");
                        setPriorityFilter("all");
                        setSearchQuery("");
                      }}
                      className="rounded border border-stone-300 bg-stone-100 hover:bg-stone-200 px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold text-stone-800 transition-colors whitespace-nowrap"
                    >
                      Clear Filters ✕
                    </button>
                  )}
                </div>
              </div>

              {viewMode === "table" ? (
                <TaskTableView tasks={filteredTasks} />
              ) : (
                <KanbanBoard initialTasks={filteredTasks} userRole={user.role} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onTaskCreated={refreshData}
      />

      <InviteUserModal
        isOpen={isInviteUserOpen}
        onClose={() => setIsInviteUserOpen(false)}
        onUserInvited={refreshData}
      />
    </div>
  );
}
